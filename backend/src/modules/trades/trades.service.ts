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
  private readonly maxAmountUsd = 1; // Максимум $1

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly marketService: MarketService,
    private readonly tokensService: TokensService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async placeTrade(placeTradeDto: PlaceTradeDto) {
    const { instrument, type, amount, userId } = placeTradeDto;

    // Получение пользователя
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Проверка баланса
    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Получение текущей цены TON/USDT
    const tonPriceUsd = await this.getTonPrice();
    const amountUsd = amount * tonPriceUsd;
    if (amountUsd > this.maxAmountUsd) {
      throw new BadRequestException(
        `Trade exceeds $${this.maxAmountUsd} limit`
      );
    }

    // Получение текущей рыночной цены
    const currentPrice = await this.getCurrentPrice(instrument);
    if (!currentPrice) {
      throw new BadRequestException('Failed to fetch market price');
    }

    // Создание сделки
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

    // Начисление токенов
    const tokensAccrued = await this.tokensService.accrueTokens(trade);

    // Обновление баланса
    user.balance -= amount;
    await this.userRepository.save(user);

    this.logger.log(
      `Trade placed: ${type} ${amount} TON on ${instrument} for user ${user.id}, accrued ${tokensAccrued} RUBLE`
    );
    return { trade, user, tokensAccrued };
  }

  async cancelTrade(cancelTradeDto: CancelTradeDto) {
    const { tradeId, userId } = cancelTradeDto;

    // Получение сделки
    const trade = await this.tradeRepository.findOne({
      where: { id: tradeId, user: { id: userId } },
      relations: ['user'],
    });
    if (!trade) {
      throw new BadRequestException('Trade not found');
    }
    if (trade.status !== 'open') {
      throw new BadRequestException('Trade is not open');
    }

    // Получение текущей цены
    const currentPrice = await this.getCurrentPrice(trade.instrument);
    if (!currentPrice) {
      throw new BadRequestException('Failed to fetch market price');
    }

    // Расчёт прибыли/убытка
    const profitLoss = this.calculateProfitLoss(trade, currentPrice);

    // Обновление сделки
    trade.status = 'canceled';
    trade.exit_price = currentPrice;
    trade.profit_loss = profitLoss;
    trade.closed_at = new Date();
    await this.tradeRepository.save(trade);

    // Обновление баланса
    const user = trade.user;
    user.balance += trade.amount + profitLoss;
    await this.userRepository.save(user);

    this.logger.log(
      `Trade canceled: ${trade.id} for user ${user.id}, P/L: ${profitLoss} TON`
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
      this.logger.error(
        `Failed to fetch TON price: ${(error as AxiosError).message}`
      );
      return 5.0;
    }
  }

  private async getCurrentPrice(instrument: string): Promise<number> {
    try {
      const response = await this.marketService.getCurrentPrice(instrument);
      return response;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${instrument}: ${(error as AxiosError).message}`
      );
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
