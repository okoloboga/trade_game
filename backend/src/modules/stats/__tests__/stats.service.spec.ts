import { Test, TestingModule } from '@nestjs/testing';
import { StatsService } from '../stats.service';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Trade } from '../../../entities/trade.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { instance, mock, when, verify, anything } from 'ts-mockito';
import { BadRequestException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { MockConfigService } from '../../../../test/setup';
import { StatsDto } from '../dto/stats.dto';

describe('StatsService', () => {
  let service: StatsService;

  const MockTradeRepository = mock<Repository<Trade>>();
  const MockRedisService = mock<Redis>();
  const MockConfigServiceInstance = instance(MockConfigService);

  const mockTrade: Trade = {
    id: 'uuid-1',
    user: {
      id: '0:1234567890abcdef',
      ton_address: '0:1234567890abcdef',
      balance: 0,
      token_balance: 0,
    },
    instrument: 'BTC-USDT',
    type: 'buy', // Исправлено: string -> 'buy'
    amount: 0.1,
    entry_price: 50000,
    exit_price: null,
    status: 'open',
    created_at: new Date('2025-01-01T00:00:00Z'),
    closed_at: null,
    profit_loss: 0,
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(Trade),
          useValue: instance(MockTradeRepository),
        },
        { provide: Redis, useValue: instance(MockRedisService) },
        { provide: ConfigService, useValue: MockConfigServiceInstance },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);

    // Сбрасываем моки
    when(MockRedisService.get(anything())).thenResolve(null);
    when(
      MockRedisService.set(anything(), anything(), anything(), anything())
    ).thenResolve('OK');
  }, 10000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTradeHistory', () => {
    it('should return trade history from cache', async () => {
      const params: StatsDto = { userId: '0:1234567890abcdef', period: '1d' };
      const cacheKey = `trade_history:${params.userId}:${params.period}`;
      const cachedTrades = [mockTrade];
      when(MockRedisService.get(cacheKey)).thenResolve(
        JSON.stringify(cachedTrades)
      );

      const result = await service.getTradeHistory(params);

      expect(result).toEqual({ trades: cachedTrades });
      verify(MockRedisService.get(cacheKey)).once();
      verify(MockTradeRepository.find(anything())).never();
    });

    it('should return trade history from db and cache it', async () => {
      const params: StatsDto = { userId: '0:1234567890abcdef', period: '1d' };
      const cacheKey = `trade_history:${params.userId}:${params.period}`;
      const trades = [mockTrade];
      when(MockRedisService.get(cacheKey)).thenResolve(null);
      when(
        MockTradeRepository.find({
          where: { user: { id: params.userId }, created_at: anything() },
          order: { created_at: 'DESC' },
          relations: ['user'],
        })
      ).thenResolve(trades);

      const result = await service.getTradeHistory(params);

      expect(result).toEqual({ trades });
      verify(MockRedisService.get(cacheKey)).once();
      verify(MockTradeRepository.find(anything())).once();
      verify(
        MockRedisService.set(cacheKey, JSON.stringify(trades), 'EX', 300)
      ).once();
    });

    it('should throw BadRequestException for invalid period', async () => {
      const params: StatsDto = {
        userId: '0:1234567890abcdef',
        period: 'invalid',
      };

      await expect(service.getTradeHistory(params)).rejects.toThrow(
        BadRequestException
      );
      verify(MockRedisService.get(anything())).never();
      verify(MockTradeRepository.find(anything())).never();
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const params = { userId: undefined, period: '1d' } as any;

      await expect(service.getTradeHistory(params)).rejects.toThrow(
        BadRequestException
      );
      verify(MockRedisService.get(anything())).never();
      verify(MockTradeRepository.find(anything())).never();
    });
  });

  describe('getSummary', () => {
    it('should return trade summary', async () => {
      const params: StatsDto = { userId: '0:1234567890abcdef', period: '1d' };
      const cacheKey = `trade_summary:${params.userId}:${params.period}`;
      const trades = [mockTrade];
      const summary = {
        totalVolume: { ton: 0.1, usd: 0.5 }, // 0.1 * 5 (TON price)
        totalProfitLoss: { ton: 0, usd: 0 },
        period: '1d',
      };
      when(MockRedisService.get(cacheKey)).thenResolve(null);
      when(MockRedisService.get('ton_price_usd')).thenResolve(
        JSON.stringify(5)
      );
      when(
        MockTradeRepository.find({
          where: { user: { id: params.userId }, created_at: anything() },
          relations: ['user'],
        })
      ).thenResolve(trades);

      const result = await service.getSummary(params);

      expect(result).toEqual(summary);
      verify(MockRedisService.get(cacheKey)).once();
      verify(MockRedisService.get('ton_price_usd')).once();
      verify(MockTradeRepository.find(anything())).once();
      verify(
        MockRedisService.set(cacheKey, JSON.stringify(summary), 'EX', 300)
      ).once();
    });

    it('should return cached trade summary', async () => {
      const params: StatsDto = { userId: '0:1234567890abcdef', period: '1d' };
      const cacheKey = `trade_summary:${params.userId}:${params.period}`;
      const summary = {
        totalVolume: { ton: 0.1, usd: 0.5 },
        totalProfitLoss: { ton: 0, usd: 0 },
        period: '1d',
      };
      when(MockRedisService.get(cacheKey)).thenResolve(JSON.stringify(summary));

      const result = await service.getSummary(params);

      expect(result).toEqual(summary);
      verify(MockRedisService.get(cacheKey)).once();
      verify(MockRedisService.get('ton_price_usd')).never();
      verify(MockTradeRepository.find(anything())).never();
    });

    it('should throw BadRequestException for invalid period', async () => {
      const params: StatsDto = {
        userId: '0:1234567890abcdef',
        period: 'invalid',
      };

      await expect(service.getSummary(params)).rejects.toThrow(
        BadRequestException
      );
      verify(MockRedisService.get(anything())).never();
      verify(MockTradeRepository.find(anything())).never();
    });

    it('should throw BadRequestException if userId is missing', async () => {
      const params = { userId: undefined, period: '1d' } as any;

      await expect(service.getSummary(params)).rejects.toThrow(
        BadRequestException
      );
      verify(MockRedisService.get(anything())).never();
      verify(MockTradeRepository.find(anything())).never();
    });
  });
});
