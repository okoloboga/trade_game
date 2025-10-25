import { Test, TestingModule } from '@nestjs/testing';
import { MarketService } from '../market.service';
import { ConfigService } from '@nestjs/config';
import { instance, when, verify } from 'ts-mockito';
import { BadRequestException } from '@nestjs/common';
import { MockOkxApi, MockConfigService } from '../../../../test/setup';

describe('MarketService', () => {
  let service: MarketService;

  const MockConfigServiceInstance = instance(MockConfigService);
  const MockOkxApiInstance = MockOkxApi;

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        { provide: ConfigService, useValue: MockConfigServiceInstance },
        { provide: 'OKX_API', useValue: MockOkxApiInstance },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);

    // Настройка моков
    when(MockConfigService.get('OKX_API_URL')).thenReturn(
      'https://www.okx.com'
    );
    MockOkxApi.get.mockReset();
  }, 10000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCandles', () => {
    it('should return candle data for valid parameters', async () => {
      const params = { instId: 'BTC-USDT', bar: '1m', limit: 100 };
      const mockResponse = {
        code: '0',
        msg: '',
        data: [[1630000000000, '50000', '51000', '49000', '50500', '1000']],
      };
      MockOkxApi.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getCandles(params);

      expect(result).toEqual(mockResponse.data);
      expect(MockOkxApi.get).toHaveBeenCalledWith(
        '/api/v5/market/candles',
        expect.objectContaining({
          params: {
            instId: params.instId,
            bar: params.bar,
            limit: params.limit.toString(),
          },
        })
      );
      verify(MockConfigService.get('OKX_API_URL')).once();
    });

    it('should throw BadRequestException for invalid bar', async () => {
      const params = { instId: 'BTC-USDT', bar: 'invalid', limit: 100 };

      await expect(service.getCandles(params)).rejects.toThrow(
        BadRequestException
      );
      expect(MockOkxApi.get).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if API returns error', async () => {
      const params = { instId: 'BTC-USDT', bar: '1m', limit: 100 };
      const mockResponse = { code: '1', msg: 'Invalid instId', data: [] };
      MockOkxApi.get.mockResolvedValue({ data: mockResponse });

      await expect(service.getCandles(params)).rejects.toThrow(
        BadRequestException
      );
      expect(MockOkxApi.get).toHaveBeenCalled();
    });
  });

  describe('getCurrentPrice', () => {
    it('should return current price for valid instId', async () => {
      const instId = 'BTC-USDT';
      const mockResponse = {
        code: '0',
        msg: '',
        data: [{ instId: 'BTC-USDT', last: '50000' }],
      };
      MockOkxApi.get.mockResolvedValue({ data: mockResponse });

      const result = await service.getCurrentPrice(instId);

      expect(result).toBe(50000);
      expect(MockOkxApi.get).toHaveBeenCalledWith(
        '/api/v5/market/ticker',
        expect.objectContaining({ params: { instId } })
      );
      verify(MockConfigService.get('OKX_API_URL')).once();
    });

    it('should throw BadRequestException for invalid instId', async () => {
      const instId = 'INVALID-USDT';
      const mockResponse = { code: '1', msg: 'Invalid instId', data: [] };
      MockOkxApi.get.mockResolvedValue({ data: mockResponse });

      await expect(service.getCurrentPrice(instId)).rejects.toThrow(
        BadRequestException
      );
      expect(MockOkxApi.get).toHaveBeenCalled();
    });
  });
});
