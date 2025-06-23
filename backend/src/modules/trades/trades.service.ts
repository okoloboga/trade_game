import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from '../../entities/trade.entity';
import { User } from '../../entities/user.entity';
import { PlaceTradeDto } from './dto/place-trade.dto';
import { CancelTradeDto } from './dto/cancel-trade.dto';
import { MarketService } from '../market/market.service';
import { TokensService } from '../tokens/tokens.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AxiosError } from 'axios';

@Injectable()
export class TradesService {
  private readonly logger = new Logger(TradesService.name);
  private readonly maxAmountUsd = 1;

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly marketService: MarketService,
    private readonly tokensService: TokensService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async placeTrade(placeTradeDto: PlaceTradeDto) {
    const { instrument, type, amount, ton_address } = placeTradeDto;
    this.logger.log(`Placing trade for ton_address: ${ton_address}, instrument: ${instrument}, type: ${type}, amount: ${amount}`);

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new UnauthorizedException('User not found');
    }
    this.logger.log(`Found user with id: ${user.id} for ton_address: ${ton_address}`);

    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const tonPriceUsd = await this.getTonPrice();
    const amountUsd = amount * tonPriceUsd;
    if (amountUsd > this.maxAmountUsd) {
      throw new BadRequestException(`Trade exceeds $${this.maxAmountUsd} limit`);
    }

    const currentPrice = await this.getCurrentPrice(instrument);
    if (!currentPrice) {
      throw new BadRequestException('Failed to fetch market price');
    }

    const trade = this.tradeRepository.create({
      user,
      instrument,
      type,
      amount,
      entry_price: currentPrice,
      status: 'open',
      profit_loss: 0,
    });
    await this.tradeRepository.save(trade);

    const tokensAccrued = await this.tokensService.accrueTokens(trade);

    user.balance -= amount;
    await this.userRepository.save(user);

    this.logger.log(
      `Trade placed: ${type} ${amount} TON on ${instrument} for user ${user.id}, ton_address: ${user.ton_address}, accrued ${tokensAccrued} RUBLE`,
    );
    return { trade, user, tokensAccrued };
  }

  async cancelTrade(cancelTradeDto: CancelTradeDto) {
    const { tradeId, ton_address } = cancelTradeDto;
    this.logger.log(`Canceling trade: ${tradeId} for ton_address: ${ton_address}`);

    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId, user: { ton_address } },
      relations: ['user'],
    });
    if (!trade) {
      this.logger.error(`Trade not found for tradeId: ${tradeId}, ton_address: ${ton_address}`);
      throw new BadRequestException('Trade not found');
    }
    if (trade.status !== 'open') {
      throw new BadRequestException('Trade is not open');
    }

    const currentPrice = await this.getCurrentPrice(trade.instrument);
    if (!currentPrice) {
      throw new BadRequestException('Failed to fetch market price');
    }

    const profitLoss = this.calculateProfitLoss(trade, currentPrice);

    trade.status = 'canceled';
    trade.exit_price = currentPrice;
    trade.profit_loss = profitLoss;
    trade.closed_at = new Date();
    await this.tradeRepository.save(trade);

    const user = trade.user;
    user.balance += trade.amount + profitLoss;
    await this.userRepository.save(user);

    this.logger.log(
      `Trade canceled: ${trade.id} for user ${user.id}, ton_address: ${user.ton_address}, P/L: ${profitLoss} TON`,
    );
    return { trade, user };
  }

  private async getTonPrice(): Promise<number> {
    const cacheKey = 'ton_price_usd';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return parseFloat(cached);
    }

    try {
      const response = await this.marketService.getCurrentPrice('TON-USDT');
      const price = response;
      await this.redis.set(cacheKey, price, 'EX', 300);
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch TON price: ${(error as AxiosError).message}`);
      return 5.0;
    }
  }

  private async getCurrentPrice(instrument: string): Promise<number> {
    try {
      const response = await this.marketService.getCurrentPrice(instrument);
      return response;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${instrument}: ${(error as AxiosError).message}`);
      return 0;
    }
  }

  private calculateProfitLoss(trade: Trade, currentPrice: number): number {
    const { type, amount, entry_price } = trade;
    let profitLoss = 0;

    if (type === 'buy') {
      profitLoss = ((currentPrice - entry_price) / entry_price) * amount;
    } else if (type === 'sell') {
      profitLoss = ((entry_price - currentPrice) / entry_price) * amount;
    }

    return parseFloat(profitLoss.toFixed(2));
  }
}
