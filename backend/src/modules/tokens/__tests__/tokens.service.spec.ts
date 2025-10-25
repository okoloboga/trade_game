import { Test, TestingModule } from '@nestjs/testing';
import { TokensService } from '../tokens.service';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Trade } from '../../../entities/trade.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { instance, mock, when, verify, anything } from 'ts-mockito';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { MarketService } from '../../market/market.service';
import { WithdrawTokensDto } from '../dto/withdraw-tokens.dto';
import { MockConfigService } from '../../../../test/setup';
import {
  TonClient4,
  Address,
  beginCell,
  WalletContractV4,
  TupleReader,
} from 'ton';

describe('TokensService', () => {
  let service: TokensService;

  const MockUserRepository = mock<Repository<User>>();
  const MockRedisService = mock<Redis>();
  const MockMarketService = mock<MarketService>();
  const MockTonClient = mock<TonClient4>();

  const mockUser: User = {
    id: '0:1234567890abcdef',
    ton_address: '0:1234567890abcdef',
    balance: 0,
    token_balance: 100,
  };

  const mockTrade: Trade = {
    id: 'uuid-1',
    user: mockUser,
    instrument: 'BTC-USDT',
    type: 'buy',
    amount: 10, // 10 TON
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
        TokensService,
        {
          provide: getRepositoryToken(User),
          useValue: instance(MockUserRepository),
        },
        { provide: Redis, useValue: instance(MockRedisService) },
        { provide: MarketService, useValue: instance(MockMarketService) },
        { provide: ConfigService, useValue: instance(MockConfigService) },
        { provide: TonClient4, useValue: instance(MockTonClient) },
      ],
    }).compile();

    service = module.get<TokensService>(TokensService);

    when(MockConfigService.get('TON_ENDPOINT')).thenReturn(
      'https://mainnet-v4.tonhubapi.com'
    );
    when(MockConfigService.get('CENTRAL_WALLET_MNEMONIC')).thenReturn(
      'word1 word2 word3 ...'
    );
    when(MockConfigService.get('JETTON_TOKEN_ADDRESS')).thenReturn('EQ...');
  }, 10000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('accrueTokens', () => {
    it('should accrue tokens based on trade volume', async () => {
      const cacheKey = `daily_volume:${mockUser.id}:${new Date().toISOString().split('T')[0]}`;
      const dailyTokensKey = `daily_tokens:${mockUser.id}`;
      when(MockRedisService.get(cacheKey)).thenResolve('0');
      when(MockRedisService.get(dailyTokensKey)).thenResolve('0');
      when(
        MockRedisService.set(anything(), anything(), anything(), anything())
      ).thenResolve('OK');
      when(MockMarketService.getCurrentPrice('TON-USDT')).thenResolve(5); // TON price = $5
      when(MockUserRepository.save(mockUser)).thenResolve(mockUser);

      const result = await service.accrueTokens(mockTrade);

      expect(result).toBe(5); // 10 TON * $5 = $50, 50/10 = 5 tokens
      verify(MockRedisService.get(cacheKey)).once();
      verify(MockRedisService.get(dailyTokensKey)).once();
      verify(MockRedisService.set(cacheKey, '50', 'EX', 24 * 60 * 60)).once();
      verify(
        MockRedisService.set(dailyTokensKey, '5', 'EX', 24 * 60 * 60)
      ).once();
      verify(MockUserRepository.save(mockUser)).once();
      expect(mockUser.token_balance).toBe(105);
    });

    it('should not accrue tokens if daily limit reached', async () => {
      const cacheKey = `daily_volume:${mockUser.id}:${new Date().toISOString().split('T')[0]}`;
      const dailyTokensKey = `daily_tokens:${mockUser.id}`;
      when(MockRedisService.get(cacheKey)).thenResolve('100');
      when(MockRedisService.get(dailyTokensKey)).thenResolve('10');
      when(MockMarketService.getCurrentPrice('TON-USDT')).thenResolve(5);

      const result = await service.accrueTokens(mockTrade);

      expect(result).toBe(0);
      verify(MockRedisService.get(cacheKey)).once();
      verify(MockRedisService.get(dailyTokensKey)).once();
      verify(
        MockRedisService.set(anything(), anything(), anything(), anything())
      ).never();
      verify(MockUserRepository.save(anything())).never();
    });

    it('should accrue partial tokens if close to daily limit', async () => {
      const cacheKey = `daily_volume:${mockUser.id}:${new Date().toISOString().split('T')[0]}`;
      const dailyTokensKey = `daily_tokens:${mockUser.id}`;
      when(MockRedisService.get(cacheKey)).thenResolve('100');
      when(MockRedisService.get(dailyTokensKey)).thenResolve('8');
      when(
        MockRedisService.set(anything(), anything(), anything(), anything())
      ).thenResolve('OK');
      when(MockMarketService.getCurrentPrice('TON-USDT')).thenResolve(5);
      when(MockUserRepository.save(mockUser)).thenResolve(mockUser);

      const result = await service.accrueTokens(mockTrade);

      expect(result).toBe(2); // Limit 10, 8 already accrued, can add 2
      verify(
        MockRedisService.set(dailyTokensKey, '10', 'EX', 24 * 60 * 60)
      ).once();
      verify(MockUserRepository.save(mockUser)).once();
      expect(mockUser.token_balance).toBe(102);
    });
  });

  describe('withdrawTokens', () => {
    const withdrawDto: WithdrawTokensDto = {
      userId: '0:1234567890abcdef',
      amount: 50,
    };

    const mockJettonWalletAddress = Address.parse('EQ_jetton_wallet...');

    beforeEach(() => {
      // Настройка моков для TON const
      when(MockTonClient.getLastBlock()).thenResolve({
        last: {
          workchain: 0,
          shard: '8000000000000000',
          seqno: 12345,
          fileHash: 'hash1',
          rootHash: 'hash2',
        },
        init: {
          fileHash: 'initHash1',
          rootHash: 'initHash2',
        },
        stateRootHash: 'stateHash',
        now: 1625097600, // Пример timestamp
      });

      when(
        MockTonClient.runMethod(anything(), anything(), anything())
      ).thenResolve({
        exitCode: 0,
        result: [
          {
            type: 'slice',
            cell: beginCell().storeAddress(mockJettonWalletAddress).endCell(),
          },
        ],
        resultRaw: null,
        block: {
          workchain: 0,
          shard: '8000000000000000',
          seqno: 12345,
          fileHash: 'hash1',
          rootHash: 'hash2',
        },
        shardBlock: {
          workchain: 0,
          shard: '8000000000000000',
          seqno: 12345,
          fileHash: 'hash1',
          rootHash: 'hash2',
        },
        reader: new TupleReader([
          {
            type: 'slice',
            cell: beginCell().storeAddress(mockJettonWalletAddress).endCell(),
          },
        ]),
      });
      when(MockTonClient.sendMessage(anything())).thenResolve({ status: 'ok' });

      // Настройка WalletContractV4
      const mockWallet = mock<WalletContractV4>();
      when(mockWallet.getSeqno(anything())).thenResolve(1);
      when(mockWallet.createTransfer(anything())).thenReturn(
        beginCell().endCell()
      );
      when(MockTonClient.open(anything())).thenReturn(instance(mockWallet));
    });

    it('should withdraw tokens successfully', async () => {
      when(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).thenResolve(mockUser);
      when(MockUserRepository.save(mockUser)).thenResolve(mockUser);

      const result = await service.withdrawTokens(withdrawDto);

      expect(result.user.token_balance).toBe(50);
      expect(result.txHash).toBeDefined();
      verify(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).once();
      verify(MockUserRepository.save(mockUser)).once();
      verify(MockTonClient.sendMessage(anything())).once();
    });

    it('should throw BadRequestException for non-positive amount', async () => {
      const invalidDto = { ...withdrawDto, amount: 0 };

      await expect(service.withdrawTokens(invalidDto)).rejects.toThrow(
        BadRequestException
      );
      verify(MockUserRepository.findOne(anything())).never();
    });

    it('should throw NotFoundException if user not found', async () => {
      when(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).thenResolve(null);

      await expect(service.withdrawTokens(withdrawDto)).rejects.toThrow(
        NotFoundException
      );
      verify(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).once();
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const highAmountDto = { ...withdrawDto, amount: 200 };
      when(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).thenResolve(mockUser);

      await expect(service.withdrawTokens(highAmountDto)).rejects.toThrow(
        BadRequestException
      );
      verify(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).once();
    });

    it('should throw BadRequestException for missing TON configuration', async () => {
      when(MockConfigService.get('CENTRAL_WALLET_MNEMONIC')).thenReturn(
        undefined
      );
      when(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).thenResolve(mockUser);

      await expect(service.withdrawTokens(withdrawDto)).rejects.toThrow(
        BadRequestException
      );
      verify(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).once();
    });

    it('should throw BadRequestException on TON transaction failure', async () => {
      when(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).thenResolve(mockUser);
      when(MockTonClient.sendMessage(anything())).thenReject(
        new Error('TON error')
      );

      await expect(service.withdrawTokens(withdrawDto)).rejects.toThrow(
        BadRequestException
      );
      verify(
        MockUserRepository.findOne({ where: { id: withdrawDto.userId } })
      ).once();
      verify(MockTonClient.sendMessage(anything())).once();
    });
  });
});
