import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Trade } from 'src/entities/trade.entity';
import { Transaction } from 'src/entities/transaction.entity';
import { User } from 'src/entities/user.entity';
import { StatsDto } from './dto/stats.dto';
import { MarketService } from '../market/market.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AxiosError } from 'axios';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly marketService: MarketService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async getTradeHistory(statsDto: StatsDto) {
    const { ton_address, period } = statsDto;
    this.logger.log(`Fetching trades for ton_address: ${ton_address}, period: ${period}`);

    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new BadRequestException('User not found');
    }
    this.logger.log(`Found user with id: ${user.id} for ton_address: ${ton_address}`);

    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }
    this.logger.log(`Searching trades from: ${startDate.toISOString()}`);

    const trades = await this.tradeRepository.find({
      where: {
        user: { ton_address },
        created_at: MoreThanOrEqual(startDate),
      },
      order: { created_at: 'DESC' },
      relations: ['user'],
    });

    if (!trades.length) {
      this.logger.log(`No trades found for user ${ton_address} in period ${period}`);
      return { trades: [] };
    }

    this.logger.log(`Fetched ${trades.length} trades for user ${ton_address} in period ${period}`);
    return { trades };
  }

  async getTransactionHistory(statsDto: StatsDto) {
    const { ton_address, period } = statsDto;
    this.logger.log(`Fetching transactions for ton_address: ${ton_address}, period: ${period}`);

    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new BadRequestException('User not found');
    }
    this.logger.log(`Found user with id: ${user.id} for ton_address: ${ton_address}`);

    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }
    this.logger.log(`Searching transactions from: ${startDate.toISOString()}`);

    const transactions = await this.transactionRepository.find({
      where: {
        user: { ton_address },
        status: 'completed',
        created_at: MoreThanOrEqual(startDate),
      },
      order: { created_at: 'DESC' },
      relations: ['user'],
    });

    if (!transactions.length) {
      this.logger.log(`No transactions found for user ${ton_address} in period ${period}`);
      return { transactions: [] };
    }

    this.logger.log(`Fetched ${transactions.length} transactions for user ${ton_address} in period ${period}`);
    return { transactions };
  }

  async getSummary(statsDto: StatsDto) {
    const { ton_address, period } = statsDto;
    this.logger.log(`Generating summary for ton_address: ${ton_address}, period: ${period}`);

    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new BadRequestException('User not found');
    }
    this.logger.log(`Found user with id: ${user.id} for ton_address: ${ton_address}`);

    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }
    this.logger.log(`Searching trades for summary from: ${startDate.toISOString()}`);

    const trades = await this.tradeRepository.find({
      where: {
        user: { ton_address },
        created_at: MoreThanOrEqual(startDate),
      },
      relations: ['user'],
    });

    let totalVolumeTon = 0;
    let totalProfitLossTon = 0;

    for (const trade of trades) {
      totalVolumeTon += trade.amount;
      if (trade.status === 'closed' && trade.profit_loss !== null) {
        totalProfitLossTon += trade.profit_loss;
      }
    }

    const tonPriceUsd = await this.getTonPrice();
    const totalVolumeUsd = totalVolumeTon * tonPriceUsd;
    const totalProfitLossUsd = totalProfitLossTon * tonPriceUsd;

    const summary = {
      totalVolume: {
        ton: parseFloat(totalVolumeTon.toFixed(2)),
        usd: parseFloat(totalVolumeUsd.toFixed(2)),
      },
      totalProfitLoss: {
        ton: parseFloat(totalProfitLossTon.toFixed(2)),
        usd: parseFloat(totalProfitLossUsd.toFixed(2)),
      },
      period,
    };

    this.logger.log(`Generated summary for user ${ton_address} in period ${period}`);
    return summary;
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
}
