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
import { TradeDto } from './dto/trade.dto';
import { MarketService } from '../market/market.service';
import { TokensService } from '../tokens/tokens.service';

@Injectable()
export class TradesService {
  private readonly logger = new Logger(TradesService.name);
  private readonly maxUsdtBalance = 10;

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly marketService: MarketService,
    private readonly tokensService: TokensService,
  ) {}

  async buyTrade(tradeDto: TradeDto) {
    const { ton_address, amount, symbol } = tradeDto;
    this.logger.log(`Processing buy trade for ton_address: ${ton_address}, amount: ${amount} USD, symbol: ${symbol}`);

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new UnauthorizedException('User not found');
    }

    const amountNum = Number(amount);
    if (Number(user.usdt_balance || 0) < amountNum) {
      throw new BadRequestException('Insufficient USDT balance');
    }

    const usdtPrice = Number(await this.getCurrentPrice(symbol));
    const tonAmount = amountNum / usdtPrice;

    user.usdt_balance = Number(user.usdt_balance || 0) - amountNum;
    user.balance = Number(user.balance || 0) + tonAmount;

    this.logger.log(`Before save: user.balance=${user.balance}, user.usdt_balance=${user.usdt_balance}, tonAmount=${tonAmount}, amount=${amountNum}`);

    if (user.usdt_balance > this.maxUsdtBalance) {
      throw new BadRequestException(`USDT balance cannot exceed ${this.maxUsdtBalance} USD`);
    }

    const trade = this.tradeRepository.create({
      user,
      instrument: symbol,
      type: 'buy',
      amount: tonAmount,
      usdt_price: usdtPrice,
      profit_loss: 0, // Для buy profit_loss = 0
    });

    await this.userRepository.save(user);
    await this.tradeRepository.save(trade);
    const tokensAccrued = await this.tokensService.accrueTokens(trade);

    this.logger.log(
      `Buy trade completed: ${tonAmount} TON for ${amountNum} USD on ${symbol} for user ${user.id}, ton_address: ${ton_address}, accrued ${tokensAccrued} RUBLE`,
    );
    return { trade, user, tokensAccrued };
  }

  async sellTrade(tradeDto: TradeDto) {
    const { ton_address, amount, symbol } = tradeDto;
    this.logger.log(`Processing sell trade for ton_address: ${ton_address}, amount: ${amount} USD, symbol: ${symbol}`);

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new UnauthorizedException('User not found');
    }

    const amountNum = Number(amount);
    const usdtPrice = Number(await this.getCurrentPrice(symbol));
    const tonAmount = amountNum / usdtPrice;

    if (Number(user.balance || 0) < tonAmount) {
      throw new BadRequestException('Insufficient TON balance');
    }

    user.balance = Number(user.balance || 0) - tonAmount;
    user.usdt_balance = Number(user.usdt_balance || 0) + amountNum;

    this.logger.log(`Before save: user.balance=${user.balance}, user.usdt_balance=${user.usdt_balance}, tonAmount=${tonAmount}, amount=${amountNum}`);

    if (user.usdt_balance > this.maxUsdtBalance) {
      throw new BadRequestException(`USDT balance cannot exceed ${this.maxUsdtBalance} USD`);
    }

    // Ищем последнюю buy для расчёта profit_loss
    const prevBuy = await this.tradeRepository.findOne({
      where: {
        user: { ton_address },
        instrument: symbol,
        type: 'buy',
      },
      order: { created_at: 'DESC' },
    });

    let profitLoss = 0;
    if (prevBuy) {
      profitLoss = (usdtPrice - Number(prevBuy.usdt_price)) * tonAmount; // USD
    }

    const trade = this.tradeRepository.create({
      user,
      instrument: symbol,
      type: 'sell',
      amount: tonAmount,
      usdt_price: usdtPrice,
      profit_loss: profitLoss,
    });

    await this.userRepository.save(user);
    await this.tradeRepository.save(trade);
    const tokensAccrued = await this.tokensService.accrueTokens(trade);

    this.logger.log(
      `Sell trade completed: ${tonAmount} TON for ${amountNum} USD on ${symbol} for user ${user.id}, ton_address: ${ton_address}, P/L: ${profitLoss} USD, accrued ${tokensAccrued} RUBLE`,
    );
    return { trade, user, tokensAccrued };
  }

  private async getCurrentPrice(instrument: string): Promise<number> {
    try {
      const price = await this.marketService.getCurrentPrice(instrument);
      if (!price || price <= 0) {
        throw new BadRequestException('Invalid market price');
      }
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch price for ${instrument}: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to fetch price for ${instrument}`);
    }
  }
}
