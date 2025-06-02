import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
import { ChallengeController } from '../challenge.controller';
import { ChallengeService } from '../challenge.service';
import { instance, mock, verify, when } from 'ts-mockito';
import { TonProof, Account } from '../../../types/ton.types';

describe('ChallengeController', () => {
  let app: INestApplication;
  let challengeService: ChallengeService;

  const MockChallengeService = mock<ChallengeService>();

  const mockAccount: Account = {
    address: 'EQ123...',
    publicKey: 'hex_public_key',
    chain: '-239',
    walletStateInit: 'te6ccgEBAQEAAgAAAA==', // state_init здесь
  };

  const mockTonProof: TonProof = {
    proof: {
      timestamp: Math.floor(Date.now() / 1000),
      domain: 'hexapp.com',
      signature: 'hex_signature',
      payload: 'challenge',
    },
  };

  const verifyDto = {
    walletAddress: 'EQ123...',
    tonProof: mockTonProof,
    account: mockAccount,
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChallengeController],
      providers: [
        { provide: ChallengeService, useValue: instance(MockChallengeService) },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    challengeService = module.get<ChallengeService>(ChallengeService);
  }, 10000);

  afterEach(async () => {
      if (app) {
          await app.close();
      }
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  describe('GET /challenge/generate', () => {
    it('should generate a challenge', async () => {
      const walletAddress = 'EQ123...';
      const challenge = 'a'.repeat(64);
      when(MockChallengeService.generateChallenge(walletAddress)).thenReturn(challenge);

      const result = await supertest.default(app.getHttpServer())
        .get('/challenge/generate')
        .query({ walletAddress })
        .expect(200);

      expect(result.body).toEqual({ challenge });
      verify(MockChallengeService.generateChallenge(walletAddress)).once();
    });

    it('should throw BadRequestException if walletAddress is missing', async () => {
      await supertest.default(app.getHttpServer())
        .get('/challenge/generate')
        .expect(400);
    });
  });

  describe('POST /challenge/verify', () => {
    it('should return valid: true for successful verification', async () => {
      when(MockChallengeService.verifyTonProof(mockAccount, mockTonProof)).thenResolve(true);

      const result = await supertest.default(app.getHttpServer())
        .post('/challenge/verify')
        .send(verifyDto)
        .expect(200);

      expect(result.body).toEqual({ valid: true });
      verify(MockChallengeService.verifyTonProof(mockAccount, mockTonProof)).once();
    });

    it('should return valid: false for failed verification', async () => {
      when(MockChallengeService.verifyTonProof(mockAccount, mockTonProof)).thenResolve(false);

      const result = await supertest.default(app.getHttpServer())
        .post('/challenge/verify')
        .send(verifyDto)
        .expect(200);

      expect(result.body).toEqual({ valid: false });
      verify(MockChallengeService.verifyTonProof(mockAccount, mockTonProof)).once();
    });

    it('should throw BadRequestException if walletAddress is missing', async () => {
      const invalidDto = { ...verifyDto, walletAddress: undefined };

      await supertest.default(app.getHttpServer())
        .post('/challenge/verify')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException if tonProof is missing', async () => {
      const invalidDto = { ...verifyDto, tonProof: undefined };

      await supertest.default(app.getHttpServer())
        .post('/challenge/verify')
        .send(invalidDto)
        .expect(400);
    });
  });
});
