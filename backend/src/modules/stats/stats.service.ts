import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Trade } from 'src/entities/trade.entity';
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
    private readonly marketService: MarketService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getTradeHistory(statsDto: StatsDto) {
    const { userId, period } = statsDto;

    // Валидация периода
    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    // Определение даты начала
    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }

    // Запрос сделок
    const trades = await this.tradeRepository.find({
      where: {
        user: { id: userId },
        created_at: MoreThanOrEqual(startDate),
      },
      order: { created_at: 'DESC' },
      relations: ['user'],
    });

    if (!trades.length) {
      this.logger.log(`No trades found for user ${userId} in period ${period}`);
      return { trades: [] };
    }

    this.logger.log(
      `Fetched ${trades.length} trades for user ${userId} in period ${period}`
    );
    return { trades };
  }

  async getSummary(statsDto: StatsDto) {
    const { userId, period } = statsDto;

    // Валидация периода
    const validPeriods = ['1d', '1w'];
    if (!validPeriods.includes(period)) {
      throw new BadRequestException('Invalid period. Use 1d or 1w');
    }

    // Определение даты начала
    const now = new Date();
    const startDate = new Date();
    if (period === '1d') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === '1w') {
      startDate.setDate(now.getDate() - 7);
    }

    // Запрос сделок
    const trades = await this.tradeRepository.find({
      where: {
        user: { id: userId },
        created_at: MoreThanOrEqual(startDate),
      },
      relations: ['user'],
    });

    // Расчёт статистики
    let totalVolumeTon = 0;
    let totalProfitLossTon = 0;

    for (const trade of trades) {
      totalVolumeTon += trade.amount;
      if (trade.status === 'canceled' && trade.profit_loss !== null) {
        totalProfitLossTon += trade.profit_loss;
      }
    }

    // Конвертация в USD
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

    this.logger.log(`Generated summary for user ${userId} in period ${period}`);
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
      this.logger.error(
        `Failed to fetch TON price: ${(error as AxiosError).message}`
      );
      return 5.0; // Fallback
    }
  }
}
