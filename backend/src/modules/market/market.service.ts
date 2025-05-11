import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios, { AxiosError } from 'axios';
import { CandlesDto } from './dto/candles.dto';

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private readonly okxApiUrl = 'https://www.okx.com/api/v5';

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis
  ) {}

  async getCandles(candlesDto: CandlesDto) {
    const { instId, bar } = candlesDto;
    const cacheKey = `candles:${instId}:${bar}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`Returning cached candles for ${instId} (${bar})`);
      return JSON.parse(cached);
    }

    try {
      const response = await axios.get(`${this.okxApiUrl}/market/candles`, {
        params: {
          instId,
          bar,
        },
        headers: {
          'OK-ACCESS-KEY': this.configService.get<string>('OKX_API_KEY'),
        },
      });

      const candles: Candle[] = response.data.data.map(
        ([ts, open, high, low, close]: [
          string,
          string,
          string,
          string,
          string,
        ]) => ({
          timestamp: parseInt(ts),
          open: parseFloat(open),
          high: parseFloat(high),
          low: parseFloat(low),
          close: parseFloat(close),
        })
      );

      // Кэшируем на 5 минут
      await this.redis.set(cacheKey, JSON.stringify(candles), 'EX', 300);
      this.logger.log(`Fetched and cached candles for ${instId} (${bar})`);

      return candles;
    } catch (error) {
      this.logger.error(
        `Failed to fetch candles: ${(error as AxiosError).message}`
      );
      throw error;
    }
  }
  async getCurrentPrice(instrument: string): Promise<number> {
    const cacheKey = `price:${instrument}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`Returning cached price for ${instrument}`);
      return parseFloat(cached);
    }

    try {
      const response = await axios.get(`${this.okxApiUrl}/market/ticker`, {
        params: {
          instId: instrument,
        },
        headers: {
          'OK-ACCESS-KEY': this.configService.get<string>('OKX_API_KEY'),
        },
      });

      const price = parseFloat(response.data.data[0].last);
      await this.redis.set(cacheKey, price, 'EX', 60); // Кэш на 1 минуту
      this.logger.log(`Fetched and cached price for ${instrument}: ${price}`);
      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${instrument}: ${(error as AxiosError).message}`
      );
      throw new BadRequestException(`Failed to fetch price for ${instrument}`);
    }
  }
}
