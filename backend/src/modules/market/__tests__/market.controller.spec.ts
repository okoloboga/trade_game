import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
import { MarketController } from '../market.controller';
import { MarketService } from '../market.service';
import { instance, mock, verify, when } from 'ts-mockito';

describe('MarketController', () => {
  let app: INestApplication;
  let marketService: MarketService;

  const MockMarketService = mock<MarketService>();

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        { provide: MarketService, useValue: instance(MockMarketService) },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    marketService = module.get<MarketService>(MarketService);
  }, 10000);

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('GET /market/candles', () => {
    it('should return candle data', async () => {
      const params = { instId: 'BTC-USDT', bar: '1m', limit: 100 };
      const candles = [[1630000000000, '50000', '51000', '49000', '50500', '1000']];
      when(MockMarketService.getCandles(params)).thenResolve(candles);

      const result = await supertest.default(app.getHttpServer())
        .get('/market/candles')
        .query(params)
        .expect(200);

      expect(result.body).toEqual(candles);
      verify(MockMarketService.getCandles(params)).once();
    });

    it('should throw BadRequestException if instId is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/market/candles')
        .query({ bar: '1m', limit: 100 })
        .expect(400);
    });

    it('should throw BadRequestException if bar is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/market/candles')
        .query({ instId: 'BTC-USDT', limit: 100 })
        .expect(400);
    });
  });

  describe('GET /market/ticker', () => {
    it('should return current price', async () => {
      const instId = 'BTC-USDT';
      const price = 50000;
      when(MockMarketService.getCurrentPrice(instId)).thenResolve(price);

      const result = await supertest.default(app.getHttpServer())
        .get('/market/ticker')
        .query({ instId })
        .expect(200);

      expect(result.body).toEqual({ price });
      verify(MockMarketService.getCurrentPrice(instId)).once();
    });

    it('should throw BadRequestException if instId is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/market/ticker')
        .expect(400);
    });
  });
});
