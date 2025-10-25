import { Test, TestingModule } from '@nestjs/testing';
import { ChallengeService } from '../challenge.service';
import { ConfigService } from '@nestjs/config';
import { TonClient4 } from 'ton';
import { instance, when, verify, anything } from 'ts-mockito';
import { TonProof, Account } from '../../../types/ton.types';
import { MockTonClient, MockConfigService } from '../../../../test/setup';

// Явная типизация для TupleItem
type TupleItem = { type: 'int'; value: bigint };

describe('ChallengeService', () => {
  let service: ChallengeService;

  const MockTonClientInstance = instance(MockTonClient);
  const MockConfigServiceInstance = instance(MockConfigService);

  const mockAccount: Account = {
    address: 'EQ123...',
    publicKey: 'a'.repeat(64),
    chain: '-239',
    walletStateInit: 'te6ccgEBAQEAAgAAAA==',
  };

  const mockTonProof: TonProof = {
    proof: {
      timestamp: Math.floor(Date.now() / 1000),
      domain: 'hexapp.com',
      signature: 'hex_signature',
      payload: 'challenge',
    },
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChallengeService,
        { provide: TonClient4, useValue: MockTonClientInstance },
        { provide: ConfigService, useValue: MockConfigServiceInstance },
      ],
    }).compile();

    service = module.get<ChallengeService>(ChallengeService);

    jest.spyOn(global.Math, 'random').mockReturnValue(0.5);
  }, 10000);

  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateChallenge', () => {
    it('should generate a challenge and store it', () => {
      const walletAddress = 'EQ123...';
      const challenge = service.generateChallenge(walletAddress);

      expect(challenge).toMatch(/^[0-9a-f]{64}$/);
      expect(challenge).toBeDefined();
    });

    it('should store challenge with validUntil', () => {
      const walletAddress = 'EQ123...';
      const challenge = service.generateChallenge(walletAddress);

      const challenges = (service as any).challenges as Map<
        string,
        { challenge: string; validUntil: number }
      >;
      const stored = challenges.get(walletAddress);

      expect(stored).toBeDefined();
      expect(stored!.challenge).toBe(challenge);
      expect(stored!.validUntil).toBeGreaterThan(Date.now());
    });
  });

  describe('verifyTonProof', () => {
    it('should return true for valid TON Proof', async () => {
      const masterAt = {
        last: {
          workchain: -1,
          shard: '0',
          seqno: 123,
          fileHash: 'hash',
          rootHash: 'hash',
        },
        init: { fileHash: 'hash', rootHash: 'hash' },
        stateRootHash: 'hash',
        now: Math.floor(Date.now() / 1000),
      };
      const runMethodResult = {
        exitCode: 0,
        result: [
          {
            type: 'int',
            value: BigInt('0x' + mockAccount.publicKey),
          } as TupleItem,
        ],
        resultRaw: null,
        block: {
          workchain: -1,
          shard: '0',
          seqno: 123,
          fileHash: 'hash',
          rootHash: 'hash',
        },
        shardBlock: {
          workchain: -1,
          shard: '0',
          seqno: 123,
          fileHash: 'hash',
          rootHash: 'hash',
        },
        reader: {
          readBigNumber: () => BigInt('0x' + mockAccount.publicKey),
          items: [],
          remaining: 0,
          peek: () => null,
          pop: () => null,
        } as any,
      };
      when(MockTonClient.getLastBlock()).thenResolve(masterAt);
      when(
        MockTonClient.runMethod(anything(), anything(), anything(), anything())
      ).thenResolve(runMethodResult);

      const result = await service.verifyTonProof(mockAccount, mockTonProof);

      expect(result).toBe(true);
      verify(MockTonClient.getLastBlock()).once();
      verify(
        MockTonClient.runMethod(anything(), anything(), anything(), anything())
      ).once();
    });

    it('should return false if walletStateInit is missing', async () => {
      const invalidAccount = { ...mockAccount, walletStateInit: undefined };
      const result = await service.verifyTonProof(invalidAccount, mockTonProof);

      expect(result).toBe(false);
      verify(MockTonClient.getLastBlock()).never();
    });

    it('should return false if timestamp is expired', async () => {
      const expiredProof = {
        ...mockTonProof,
        proof: {
          ...mockTonProof.proof,
          timestamp: Math.floor(Date.now() / 1000) - 1000,
        },
      };
      const result = await service.verifyTonProof(mockAccount, expiredProof);

      expect(result).toBe(false);
      verify(MockTonClient.getLastBlock()).never();
    });

    it('should return false if runMethod fails', async () => {
      const masterAt = {
        last: {
          workchain: -1,
          shard: '0',
          seqno: 123,
          fileHash: 'hash',
          rootHash: 'hash',
        },
        init: { fileHash: 'hash', rootHash: 'hash' },
        stateRootHash: 'hash',
        now: Math.floor(Date.now() / 1000),
      };
      const runMethodResult = {
        exitCode: 1,
        result: [] as TupleItem[],
        resultRaw: null,
        block: {
          workchain: -1,
          shard: '0',
          seqno: 123,
          fileHash: 'hash',
          rootHash: 'hash',
        },
        shardBlock: {
          workchain: -1,
          shard: '0',
          seqno: 123,
          fileHash: 'hash',
          rootHash: 'hash',
        },
        reader: {
          readBigNumber: () => BigInt(0),
          items: [],
          remaining: 0,
          peek: () => null,
          pop: () => null,
        } as any,
      };
      when(MockTonClient.getLastBlock()).thenResolve(masterAt);
      when(
        MockTonClient.runMethod(anything(), anything(), anything(), anything())
      ).thenResolve(runMethodResult);

      const result = await service.verifyTonProof(mockAccount, mockTonProof);

      expect(result).toBe(false);
      verify(MockTonClient.getLastBlock()).once();
      verify(
        MockTonClient.runMethod(anything(), anything(), anything(), anything())
      ).once();
    });
  });
});
