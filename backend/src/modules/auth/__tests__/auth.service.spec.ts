import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ChallengeService } from '../../challenge/challenge.service';
import { instance, when, verify, reset, anything } from 'ts-mockito';
import { UnauthorizedException } from '@nestjs/common';
import { TonProof, Account } from '../../../types/ton.types';
import {
  MockUserRepository,
  MockJwtService,
  MockChallengeService, // Импортируй из setup
} from '../../../../test/setup';

describe('AuthService', () => {
  const USER_REPOSITORY_TOKEN = getRepositoryToken(User);
  let service: AuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let challengeService: ChallengeService;

  const mockUser = {
    id: 'uuid-1',
    ton_address: 'EQ1234567890abcdef',
    balance: 0,
    token_balance: 0,
  };

  const mockAuthDto = {
    ton_address: 'EQ1234567890abcdef',
    tonProof: {
      proof: {
        timestamp: Math.floor(Date.now() / 1000),
        domain: 'yourapp.com',
        signature: 'hex_signature',
        payload: 'challenge',
      },
    } as TonProof,
    account: {
      address: 'EQ1234567890abcdef',
      publicKey: 'hex_public_key',
      chain: '-239',
      walletStateInit: 'base64_state_init',
    } as Account,
  };

  beforeAll(() => {
    // Сброс всех моков
    reset(MockChallengeService);
    reset(MockUserRepository);
    reset(MockJwtService);
  });

  beforeEach(async () => {
    console.log('Starting beforeEach...');
    console.time('Test.createTestingModule');

    console.log('User repository token:', USER_REPOSITORY_TOKEN);
    console.log('User entity:', User);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: USER_REPOSITORY_TOKEN,
          useValue: instance<Repository<User>>(MockUserRepository),
        },
        { provide: JwtService, useValue: instance(MockJwtService) },
        { provide: ChallengeService, useValue: instance(MockChallengeService) },
      ],
    }).compile();

    console.timeEnd('Test.createTestingModule');
    console.log('Module created successfully');

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(USER_REPOSITORY_TOKEN);
    jwtService = module.get<JwtService>(JwtService);
    challengeService = module.get<ChallengeService>(ChallengeService);

    console.log('beforeEach completed');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(userRepository).toBeDefined();
    expect(jwtService).toBeDefined();
    expect(challengeService).toBeDefined();
  });

  describe('login', () => {
    beforeEach(() => {
      // Сброс моков перед каждым тестом
      reset(MockChallengeService);
      reset(MockUserRepository);
      reset(MockJwtService);
    });

    it('should login existing user and return JWT', async () => {
      // Настройка моков для этого теста
      when(
        MockChallengeService.verifyTonProof(anything(), anything())
      ).thenResolve(true);
      when(MockUserRepository.findOne(anything())).thenResolve(mockUser);
      when(MockJwtService.signAsync(anything())).thenResolve('jwt-token');

      const result = await service.login(mockAuthDto);

      expect(result).toEqual({ access_token: 'jwt-token', user: mockUser });
      verify(
        MockChallengeService.verifyTonProof(anything(), anything())
      ).once();
      verify(MockUserRepository.findOne(anything())).once();
      verify(MockJwtService.signAsync(anything())).once();
    });

    it('should create new user if not exists and return JWT', async () => {
      when(
        MockChallengeService.verifyTonProof(anything(), anything())
      ).thenResolve(true);
      when(MockUserRepository.findOne(anything())).thenResolve(null);
      // Используем thenCall для более гибкого мокинга
      when(MockUserRepository.create(anything())).thenCall(() => mockUser);
      when(MockUserRepository.save(anything())).thenResolve(mockUser);
      when(MockJwtService.signAsync(anything())).thenResolve('jwt-token');

      const result = await service.login(mockAuthDto);

      expect(result).toEqual({ access_token: 'jwt-token', user: mockUser });
      verify(MockUserRepository.create(anything())).once();
      verify(MockUserRepository.save(anything())).once();
    });

    it('should throw UnauthorizedException if TON Proof is invalid', async () => {
      when(
        MockChallengeService.verifyTonProof(anything(), anything())
      ).thenResolve(false);

      await expect(service.login(mockAuthDto)).rejects.toThrow(
        UnauthorizedException
      );
      verify(
        MockChallengeService.verifyTonProof(anything(), anything())
      ).once();
      verify(MockUserRepository.findOne(anything())).never();
    });
  });
});
