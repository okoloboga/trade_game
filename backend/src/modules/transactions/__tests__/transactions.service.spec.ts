import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../transactions.service';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { instance, mock, when, verify, anything } from 'ts-mockito';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChallengeService } from '../../challenge/challenge.service';
import { DepositDto } from '../dto/deposit.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { TonClient4, toNano } from 'ton';
import { MockConfigService } from '../../../../test/setup';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let userRepository: Repository<User>;
  let challengeService: ChallengeService;
  let tonClient: TonClient4;

  const MockUserRepository = mock<Repository<User>>();
  const MockChallengeService = mock<ChallengeService>();
  const MockTonClient = mock<TonClient4>();
  const MockConfigServiceInstance = instance(MockConfigService);

  const mockUser: User = {
    id: '0:1234567890abcdef',
    ton_address: '0:1234567890abcdef',
    balance: 100,
    token_balance: 0,
  };

  const depositDto: DepositDto = {
    userId: '0:1234567890abcdef',
    amount: 10,
    txHash: 'txHash123',
    tonProof: {
        proof: {
            timestamp: 1625097600,
            domain: 'example.com',
        signature: 'sig',
        payload: 'payload',
        },
    },
    account: {
        address: '0:1234567890abcdef',
        publicKey: 'pubKey123',
        chain: '-239', // TON mainnet chain ID
    },
  };

  const withdrawDto: WithdrawDto = {
    userId: '0:1234567890abcdef',
    amount: 50,
    ton_address: '0:1234567890abcdef',
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(User), useValue: instance(MockUserRepository) },
        { provide: ChallengeService, useValue: instance(MockChallengeService) },
        { provide: TonClient4, useValue: instance(MockTonClient) },
        { provide: ConfigService, useValue: MockConfigServiceInstance },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    userRepository = module.get(getRepositoryToken(User));
    challengeService = module.get(ChallengeService);
    tonClient = module.get(TonClient4);

    when(MockConfigService.get('TON_ENDPOINT')).thenReturn('https://mainnet-v4.tonhubapi.com');
  }, 10000);

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processDeposit', () => {
    beforeEach(() => {
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
        now: 1625097600,
      });
      when(MockTonClient.getAccountLite(anything(), anything())).thenResolve({
        account: {
            balance: { coins: toNano('15').toString() },
            last: { hash: 'txHash123', lt: '123' },
            state: { type: 'active', codeHash: 'codeHash123', dataHash: 'dataHash123' },
            storageStat: null,
        },
      });
    });

    it('should process deposit successfully', async () => {
      when(MockUserRepository.findOne({ where: { id: depositDto.userId } })).thenResolve(mockUser);
      when(MockChallengeService.verifyTonProof(depositDto.account, depositDto.tonProof)).thenResolve(true);
      when(MockUserRepository.save(anything())).thenResolve(mockUser);

      const result = await service.processDeposit(depositDto);

      expect(result.user.balance).toBe(110);
      expect(result.status).toBe('confirmed');
      verify(MockUserRepository.findOne({ where: { id: depositDto.userId } })).once();
      verify(MockChallengeService.verifyTonProof(depositDto.account, depositDto.tonProof)).once();
      verify(MockUserRepository.save(mockUser)).once();
      verify(MockTonClient.getAccountLite(anything(), anything())).once();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...depositDto, amount: 0 };

      await expect(service.processDeposit(invalidDto)).rejects.toThrow(BadRequestException);
      verify(MockUserRepository.findOne(anything())).never();
    });

    it('should throw NotFoundException if user not found', async () => {
      when(MockUserRepository.findOne({ where: { id: depositDto.userId } })).thenResolve(null);

      await expect(service.processDeposit(depositDto)).rejects.toThrow(NotFoundException);
      verify(MockUserRepository.findOne({ where: { id: depositDto.userId } })).once();
    });

    it('should throw BadRequestException for invalid TON proof', async () => {
      when(MockUserRepository.findOne({ where: { id: depositDto.userId } })).thenResolve(mockUser);
      when(MockChallengeService.verifyTonProof(depositDto.account, depositDto.tonProof)).thenResolve(false);

      await expect(service.processDeposit(depositDto)).rejects.toThrow(BadRequestException);
      verify(MockChallengeService.verifyTonProof(depositDto.account, depositDto.tonProof)).once();
    });

    it('should throw BadRequestException for invalid transaction', async () => {
      when(MockUserRepository.findOne({ where: { id: depositDto.userId } })).thenResolve(mockUser);
      when(MockChallengeService.verifyTonProof(depositDto.account, depositDto.tonProof)).thenResolve(true);
      when(MockTonClient.getAccountLite(anything(), anything())).thenResolve({
        account: {
            balance: { coins: toNano('15').toString() },
            last: { hash: 'txHash123', lt: '123' },
            state: { type: 'active', codeHash: 'codeHash123', dataHash: 'dataHash123' },
            storageStat: null,
        },
      });

      await expect(service.processDeposit(depositDto)).rejects.toThrow(BadRequestException);
      verify(MockTonClient.getAccountLite(anything(), anything())).once();
    });
  });

  describe('processWithdraw', () => {
    it('should process withdraw successfully', async () => {
      when(MockUserRepository.findOne({ where: { id: withdrawDto.userId } })).thenResolve(mockUser);
      when(MockUserRepository.save(anything())).thenResolve(mockUser);

      const result = await service.processWithdraw(withdrawDto);

      expect(result.user.balance).toBe(50);
      expect(result.status).toBe('pending');
      verify(MockUserRepository.findOne({ where: { id: withdrawDto.userId } })).once();
      verify(MockUserRepository.save(mockUser)).once();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...withdrawDto, amount: 0 };

      await expect(service.processWithdraw(invalidDto)).rejects.toThrow(BadRequestException);
      verify(MockUserRepository.findOne(anything())).never();
    });

    it('should throw NotFoundException if user not found', async () => {
      when(MockUserRepository.findOne({ where: { id: withdrawDto.userId } })).thenResolve(null);

      await expect(service.processWithdraw(withdrawDto)).rejects.toThrow(NotFoundException);
      verify(MockUserRepository.findOne({ where: { id: withdrawDto.userId } })).once();
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      const highAmountDto = { ...withdrawDto, amount: 200 };
      when(MockUserRepository.findOne({ where: { id: withdrawDto.userId } })).thenResolve(mockUser);

      await expect(service.processWithdraw(highAmountDto)).rejects.toThrow(BadRequestException);
      verify(MockUserRepository.findOne({ where: { id: withdrawDto.userId } })).once();
    });
  });
});
