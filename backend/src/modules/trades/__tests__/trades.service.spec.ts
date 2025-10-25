import { Test, TestingModule } from '@nestjs/testing';
import { TradesService } from '../trades.service';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Trade } from '../../../entities/trade.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { instance, mock, when, verify, anything } from 'ts-mockito';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { TokensService } from '../../tokens/tokens.service';
import { MarketService } from '../../market/market.service';
import { PlaceTradeDto } from '../dto/place-trade.dto';
import { CancelTradeDto } from '../dto/cancel-trade.dto';
import { MockConfigService } from '../../../../test/setup';

describe('TradesService', () => {
  let service: TradesService;

  const MockUserRepository = mock<Repository<User>>();
  const MockTradeRepository = mock<Repository<Trade>>();
  const MockTokensService = mock<TokensService>();
  const MockMarketService = mock<MarketService>();
  const MockRedisService = mock<Redis>();
  const MockConfigServiceInstance = instance(MockConfigService);

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

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesService,
        {
          provide: getRepositoryToken(User),
          useValue: instance(MockUserRepository),
        },
        {
          provide: getRepositoryToken(Trade),
          useValue: instance(MockTradeRepository),
        },
        { provide: TokensService, useValue: instance(MockTokensService) },
        { provide: MarketService, useValue: instance(MockMarketService) },
        { provide: Redis, useValue: instance(MockRedisService) },
        { provide: ConfigService, useValue: MockConfigServiceInstance },
      ],
    }).compile();

    service = module.get<TradesService>(TradesService);

    when(MockConfigService.get('TON_ENDPOINT')).thenReturn(
      'https://mainnet-v4.tonhubapi.com'
    );
  }, 10000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('placeTrade', () => {
    const placeTradeDto: PlaceTradeDto = {
      instrument: 'BTC-USDT',
      type: 'buy',
      amount: 0.1,
      userId: '0:1234567890abcdef',
    };

    it('should place trade successfully', async () => {
      when(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).thenResolve(mockUser);
      when(MockRedisService.get('ton_price_usd')).thenResolve('5');
      when(MockMarketService.getCurrentPrice('BTC-USDT')).thenResolve(50000);
      when(MockTradeRepository.create(anything())).thenReturn(mockTrade as any);
      when(MockTradeRepository.save(anything())).thenResolve(mockTrade);
      when(MockUserRepository.save(anything())).thenResolve(mockUser);
      when(MockTokensService.accrueTokens(anything())).thenResolve(5);

      const result = await service.placeTrade(placeTradeDto);

      expect(result.trade).toEqual(mockTrade);
      expect(result.user.balance).toBe(99.9);
      expect(result.tokensAccrued).toBe(5);
      verify(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).once();
      verify(MockRedisService.get('ton_price_usd')).once();
      verify(MockMarketService.getCurrentPrice('BTC-USDT')).once();
      verify(MockTradeRepository.save(mockTrade)).once();
      verify(MockUserRepository.save(mockUser)).once();
      verify(MockTokensService.accrueTokens(mockTrade)).once();
    });

    it('should throw UnauthorizedException if user not found', async () => {
      when(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).thenResolve(null);

      await expect(service.placeTrade(placeTradeDto)).rejects.toThrow(
        UnauthorizedException
      );
      verify(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).once();
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const highAmountDto = { ...placeTradeDto, amount: 200 };
      when(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).thenResolve(mockUser);

      await expect(service.placeTrade(highAmountDto)).rejects.toThrow(
        BadRequestException
      );
      verify(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).once();
    });

    it('should throw BadRequestException if trade exceeds $1 limit', async () => {
      when(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).thenResolve(mockUser);
      when(MockRedisService.get('ton_price_usd')).thenResolve('20'); // 0.1 * 20 = $2 > $1

      await expect(service.placeTrade(placeTradeDto)).rejects.toThrow(
        BadRequestException
      );
      verify(MockRedisService.get('ton_price_usd')).once();
    });

    it('should throw BadRequestException if market price fetch fails', async () => {
      when(
        MockUserRepository.findOne({ where: { id: placeTradeDto.userId } })
      ).thenResolve(mockUser);
      when(MockRedisService.get('ton_price_usd')).thenResolve('5');
      when(MockMarketService.getCurrentPrice('BTC-USDT')).thenResolve(0);

      await expect(service.placeTrade(placeTradeDto)).rejects.toThrow(
        BadRequestException
      );
      verify(MockMarketService.getCurrentPrice('BTC-USDT')).once();
    });
  });

  describe('cancelTrade', () => {
    const cancelTradeDto: CancelTradeDto = {
      tradeId: 'uuid-1',
      userId: '0:1234567890abcdef',
    };

    it('should cancel trade successfully', async () => {
      when(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).thenResolve(mockTrade);
      when(MockMarketService.getCurrentPrice('BTC-USDT')).thenResolve(51000);
      when(MockTradeRepository.save(anything())).thenResolve(mockTrade);
      when(MockUserRepository.save(anything())).thenResolve(mockUser);

      const result = await service.cancelTrade(cancelTradeDto);

      expect(result.trade.status).toBe('canceled');
      expect(result.trade.exit_price).toBe(51000);
      expect(result.trade.profit_loss).toBe(0.02); // ((51000 - 50000) / 50000) * 0.1 = 0.02
      expect(result.trade.closed_at).toBeDefined();
      expect(result.user.balance).toBe(100.02); // 100 + 0.02
      verify(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).once();
      verify(MockMarketService.getCurrentPrice('BTC-USDT')).once();
      verify(MockTradeRepository.save(mockTrade)).once();
      verify(MockUserRepository.save(mockUser)).once();
    });

    it('should throw BadRequestException if trade not found', async () => {
      when(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).thenResolve(null);

      await expect(service.cancelTrade(cancelTradeDto)).rejects.toThrow(
        BadRequestException
      );
      verify(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).once();
    });

    it('should throw BadRequestException if trade is not open', async () => {
      const closedTrade = { ...mockTrade, status: 'closed' as const };
      when(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).thenResolve(closedTrade);

      await expect(service.cancelTrade(cancelTradeDto)).rejects.toThrow(
        BadRequestException
      );
      verify(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).once();
    });

    it('should throw BadRequestException if market price fetch fails', async () => {
      when(
        MockTradeRepository.findOne({
          where: {
            id: cancelTradeDto.tradeId,
            user: { id: cancelTradeDto.userId },
          },
          relations: ['user'],
        })
      ).thenResolve(mockTrade);
      when(MockMarketService.getCurrentPrice('BTC-USDT')).thenResolve(0);

      await expect(service.cancelTrade(cancelTradeDto)).rejects.toThrow(
        BadRequestException
      );
      verify(MockMarketService.getCurrentPrice('BTC-USDT')).once();
    });
  });
});
