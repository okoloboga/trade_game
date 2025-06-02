import { mock, when, instance, anything } from 'ts-mockito';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { Trade } from '../src/entities/trade.entity';
import { Transaction } from '../src/entities/transaction.entity';
import { Token } from '../src/entities/token.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TonClient4 } from '@ton/ton';
import { Redis } from 'ioredis';
import { toNano } from '@ton/core';
import { ChallengeService } from '../src/modules/challenge/challenge.service';

// ИСПРАВЛЕННЫЙ Mock TypeOrmModule и InjectRepository
jest.mock('@nestjs/typeorm', () => {
  return {
    TypeOrmModule: {
      forRoot: jest.fn().mockReturnValue({
        module: class MockTypeOrmRootModule {},
        providers: [],
        exports: [],
      }),
      forFeature: jest.fn().mockReturnValue({
        module: class MockTypeOrmFeatureModule {},
        providers: [],
        exports: [],
      }),
    },
    InjectRepository: jest.fn().mockImplementation(() => (target: any) => target),
    getRepositoryToken: jest.fn().mockImplementation((entity) => `${entity.name}Repository`),
  };
});

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    disconnect: jest.fn(),
  }));
});

export const MockUserRepository = mock<Repository<User>>();
when(MockUserRepository.findOne(anything())).thenResolve(null);
when(MockUserRepository.create(anything())).thenCall((entityLikeArray) => {
  if (Array.isArray(entityLikeArray)) {
    return entityLikeArray.map(() => ({
      id: 'uuid-1',
      ton_address: 'EQ1234567890abcdef',
      balance: 0,
      token_balance: 0,
    } as User));
  }
  return {
    id: 'uuid-1',
    ton_address: entityLikeArray.ton_address || 'EQ1234567890abcdef',
    balance: entityLikeArray.balance || 0,
    token_balance: entityLikeArray.token_balance || 0,
  } as User;
});
when(MockUserRepository.save(anything())).thenResolve({
  id: 'uuid-1',
  ton_address: 'EQ1234567890abcdef',
  balance: 0,
  token_balance: 0,
} as User);

export const MockTradeRepository = mock<Repository<Trade>>();
export const MockTransactionRepository = mock<Repository<Transaction>>();
export const MockTokenRepository = mock<Repository<Token>>();

export const MockChallengeService = mock<ChallengeService>();
when(MockChallengeService.generateChallenge(anything())).thenReturn('mocked-challenge-hex');
when(MockChallengeService.verifyTonProof(anything(), anything())).thenResolve(true);

export const MockRedisService = mock<Redis>();
when(MockRedisService.get('ton_price_usd')).thenReturn(Promise.resolve('10'));

export const MockTonClient = mock<TonClient4>();
when(MockTonClient.getLastBlock()).thenResolve({
  last: { workchain: 0, shard: '8000000000000000', seqno: 12345, fileHash: 'hash1', rootHash: 'hash2' },
  init: { fileHash: 'initHash1', rootHash: 'initHash2' },
  stateRootHash: 'stateHash',
  now: 1625097600,
});
when(MockTonClient.getAccountLite(anything(), anything())).thenResolve({
  account: {
    balance: { coins: toNano('15').toString(), currencies: {} },
    last: { hash: 'txHash123', lt: '123' },
    state: { type: 'active', codeHash: 'codeHash123', dataHash: 'dataHash123' },
    storageStat: null,
  },
});

export const MockConfigService = mock<ConfigService>();
when(MockConfigService.get('TON_ENDPOINT')).thenReturn('https://mainnet-v4.tonhubapi.com');
when(MockConfigService.get('JETTON_TOKEN_ADDRESS')).thenReturn('0:1234567890abcdef');

export const MockJwtService = mock<JwtService>();
when(MockJwtService.signAsync(anything())).thenResolve('mocked-jwt-token');

export const MockOkxApi = mock<{ get: () => Promise<{ data: { last: number } }> }>();
when(MockOkxApi.get()).thenResolve({ data: { last: 5.0 } });

export const MockConfigServiceInstance = instance(MockConfigService);
export const MockChallengeServiceInstance = instance(MockChallengeService);

console.log('Setup file loaded successfully');
