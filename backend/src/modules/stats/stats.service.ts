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
    @InjectRedis() private readonly redis: Redis
  ) {}

  /**
   * Retrieves trade history for a user within a specified period.
   * @param statsDto - DTO containing TON address and period ('1d' or '1w').
   * @returns {Promise<{ trades: Trade[] }>} Object containing an array of trades.
   * @throws {BadRequestException} If period is invalid or user not found.
   */
  async getTradeHistory(statsDto: StatsDto) {
    const { ton_address, period } = statsDto;
    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new BadRequestException('User not found');
    }
    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }
    const trades = await this.tradeRepository.find({
      where: {
        user: { ton_address },
        created_at: MoreThanOrEqual(startDate),
      },
      order: { created_at: 'DESC' },
      relations: ['user'],
    });

    if (!trades.length) {
      return { trades: [] };
    }
    return { trades };
  }

  /**
   * Retrieves transaction history for a user within a specified period.
   * @param statsDto - DTO containing TON address and period ('1d' or '1w').
   * @returns {Promise<{ transactions: Transaction[] }>} Object containing an array of completed transactions.
   * @throws {BadRequestException} If period is invalid or user not found.
   */
  async getTransactionHistory(statsDto: StatsDto) {
    const { ton_address, period } = statsDto;
    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new BadRequestException('User not found');
    }
    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }
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
      return { transactions: [] };
    }
    return { transactions };
  }

  /**
   * Calculates a summary of trading activity for a user within a specified period.
   * @param statsDto - DTO containing TON address and period ('1d' or '1w').
   * @returns {Promise<{ totalVolume: { ton: number, usd: number }, totalProfitLoss: { ton: number, usd: number }, period: string }>} Summary of trading volume and profit/loss.
   * @throws {BadRequestException} If period is invalid or user not found.
   */
  async getSummary(statsDto: StatsDto) {
    const { ton_address, period } = statsDto;
    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new BadRequestException('User not found');
    }
    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }
    const trades = await this.tradeRepository.find({
      where: {
        user: { ton_address },
        created_at: MoreThanOrEqual(startDate),
      },
      relations: ['user'],
    });

    let totalVolumeTon = 0;
    let totalVolumeUsd = 0;
    let totalProfitLossUsd = 0;

    for (const trade of trades) {
      totalVolumeTon += Number(trade.amount);
      totalVolumeUsd += Number(trade.amount) * Number(trade.usdt_price);
      totalProfitLossUsd += Number(trade.profit_loss);
    }

    const tonPriceUsd = await this.getTonPrice();
    const totalProfitLossTon = totalProfitLossUsd / tonPriceUsd;

    const summary = {
      totalVolume: {
        ton: Number(totalVolumeTon.toFixed(5)),
        usd: Number(totalVolumeUsd.toFixed(5)),
      },
      totalProfitLoss: {
        ton: Number(totalProfitLossTon.toFixed(5)),
        usd: Number(totalProfitLossUsd.toFixed(5)),
      },
      period,
    };
    return summary;
  }

  /**
   * Fetches the current TON price in USD, with caching.
   * @returns {Promise<number>} Current TON price in USD.
   */
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
}
