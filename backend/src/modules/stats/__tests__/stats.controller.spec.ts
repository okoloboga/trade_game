import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
import { StatsController } from '../stats.controller';
import { StatsService } from '../stats.service';
import { Trade } from '../../../entities/trade.entity';
import { instance, mock, verify, when } from 'ts-mockito';
import { StatsDto } from '../dto/stats.dto';

describe('StatsController', () => {
  let app: INestApplication;
  let statsService: StatsService;

  const MockStatsService = mock<StatsService>();

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
      controllers: [StatsController],
      providers: [
        { provide: StatsService, useValue: instance(MockStatsService) },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    statsService = module.get<StatsService>(StatsService);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('GET /stats/trades', () => {
    it('should return trade history', async () => {
      const params: StatsDto = { userId: '0:1234567890abcdef', period: '1d' };
      const trades = [mockTrade];
      when(MockStatsService.getTradeHistory(params)).thenResolve({ trades });

      const result = await supertest.default(app.getHttpServer())
        .get('/stats/trades')
        .query(params)
        .expect(200);

      expect(result.body).toEqual({ trades });
      verify(MockStatsService.getTradeHistory(params)).once();
    });

    it('should throw BadRequestException if userId is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/stats/trades')
        .query({ period: '1d' })
        .expect(400);
    });

    it('should throw BadRequestException if period is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/stats/trades')
        .query({ userId: '0:1234567890abcdef' })
        .expect(400);
    });
  });

  describe('GET /stats/summary', () => {
    it('should return trade summary', async () => {
      const params: StatsDto = { userId: '0:1234567890abcdef', period: '1d' };
      const summary = {
        totalVolume: { ton: 0.1, usd: 0.5 },
        totalProfitLoss: { ton: 0, usd: 0 },
        period: '1d',
      };
      when(MockStatsService.getSummary(params)).thenResolve(summary);

      const result = await supertest.default(app.getHttpServer())
        .get('/stats/summary')
        .query(params)
        .expect(200);

      expect(result.body).toEqual(summary);
      verify(MockStatsService.getSummary(params)).once();
    });

    it('should throw BadRequestException if userId is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/stats/summary')
        .query({ period: '1d' })
        .expect(400);
    });

    it('should throw BadRequestException if period is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/stats/summary')
        .query({ userId: '0:1234567890abcdef' })
        .expect(400);
    });
  });
});
