import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as supertest from 'supertest';
import { TradesController } from '../trades.controller';
import { TradesService } from '../trades.service';
import { instance, mock, verify, when } from 'ts-mockito';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PlaceTradeDto } from '../dto/place-trade.dto';
import { CancelTradeDto } from '../dto/cancel-trade.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User } from '../../../entities/user.entity';
import { Trade } from '../../../entities/trade.entity';

describe('TradesController', () => {
  let app: INestApplication;

  const MockTradesService = mock<TradesService>();

  const mockUser: User = {
    id: '0:1234567890abcdef',
    ton_address: '0:1234567890abcdef',
    balance: 100,
    token_balance: 0,
  };

  const mockTrade: Trade = {
    id: 'uuid-1',
    user: mockUser,
    instrument: 'BTC-USDT',
    type: 'buy',
    amount: 0.1,
    entry_price: 50000,
    exit_price: null as unknown as number,
    status: 'open',
    created_at: new Date('2025-01-01T00:00:00Z'),
    closed_at: null as unknown as Date,
    profit_loss: 0,
  };

  const placeTradeDto: PlaceTradeDto = {
    instrument: 'BTC-USDT',
    type: 'buy',
    amount: 0.1,
    userId: '0:1234567890abcdef',
  };

  const cancelTradeDto: CancelTradeDto = {
    tradeId: 'uuid-1',
    userId: '0:1234567890abcdef',
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradesController],
      providers: [
        { provide: TradesService, useValue: instance(MockTradesService) },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { userId: placeTradeDto.userId };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  }, 10000);

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('POST /trades/place', () => {
    it('should place trade successfully', async () => {
      const response = { trade: mockTrade, user: mockUser, tokensAccrued: 5 };
      when(MockTradesService.placeTrade(placeTradeDto)).thenResolve(response);

      const result = await supertest
        .default(app.getHttpServer())
        .post('/trades/place')
        .send(placeTradeDto)
        .expect(200);

      expect(result.body).toEqual(response);
      verify(MockTradesService.placeTrade(placeTradeDto)).once();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...placeTradeDto, amount: 0 };

      await supertest
        .default(app.getHttpServer())
        .post('/trades/place')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for missing userId', async () => {
      const invalidDto = { ...placeTradeDto, userId: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/trades/place')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for invalid type', async () => {
      const invalidDto = { ...placeTradeDto, type: 'invalid' };

      await supertest
        .default(app.getHttpServer())
        .post('/trades/place')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      when(MockTradesService.placeTrade(placeTradeDto)).thenReject(
        new UnauthorizedException('User not found')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/trades/place')
        .send(placeTradeDto)
        .expect(401);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      when(MockTradesService.placeTrade(placeTradeDto)).thenReject(
        new BadRequestException('Insufficient balance')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/trades/place')
        .send(placeTradeDto)
        .expect(400);
    });
  });

  describe('POST /trades/cancel', () => {
    it('should cancel trade successfully', async () => {
      const response = {
        trade: { ...mockTrade, status: 'canceled' as const },
        user: mockUser,
      };
      when(MockTradesService.cancelTrade(cancelTradeDto)).thenResolve(response);

      const result = await supertest
        .default(app.getHttpServer())
        .post('/trades/cancel')
        .send(cancelTradeDto)
        .expect(200);

      expect(result.body).toEqual(response);
      verify(MockTradesService.cancelTrade(cancelTradeDto)).once();
    });

    it('should throw BadRequestException for missing tradeId', async () => {
      const invalidDto = { ...cancelTradeDto, tradeId: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/trades/cancel')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for missing userId', async () => {
      const invalidDto = { ...cancelTradeDto, userId: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/trades/cancel')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException if trade not found', async () => {
      when(MockTradesService.cancelTrade(cancelTradeDto)).thenReject(
        new BadRequestException('Trade not found')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/trades/cancel')
        .send(cancelTradeDto)
        .expect(400);
    });
  });
});
