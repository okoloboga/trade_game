import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { instance, mock, verify, when } from 'ts-mockito';
import { TonProof, Account } from '../../../types/ton.types';

describe('AuthController', () => {
  let app: INestApplication;

  const MockAuthService = mock<AuthService>();

  const mockUser = {
    id: 'uuid-1',
    ton_address: 'EQ123...',
    balance: 0,
    token_balance: 0,
  };

  const mockAuthDto = {
    ton_address: 'EQ123...',
    tonProof: {
      proof: {
        timestamp: Math.floor(Date.now() / 1000),
        domain: 'hexapp.com',
        signature: 'hex_signature',
        payload: 'challenge',
      },
    } as TonProof,
    account: {
      address: 'EQ123...',
      publicKey: 'hex_public_key',
      chain: '-239',
      walletStateInit: 'base64_state_init',
    } as Account,
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    console.time('Test.createTestingModule');
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: instance(MockAuthService) },
      ],
    }).compile();
    console.timeEnd('Test.createTestingModule');
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

  describe('POST /auth/login', () => {
    it('should return JWT and user on successful login', async () => {
      const response = { access_token: 'jwt-token', user: mockUser };
      when(MockAuthService.login(mockAuthDto)).thenResolve(response);

      const result = await supertest
        .default(app.getHttpServer())
        .post('/auth/login')
        .send(mockAuthDto)
        .expect(200);

      expect(result.body).toEqual(response);
      verify(MockAuthService.login(mockAuthDto)).once();
    });

    it('should return 401 on invalid TON Proof', async () => {
      when(MockAuthService.login(mockAuthDto)).thenReject(
        new Error('Invalid TON Proof')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/auth/login')
        .send(mockAuthDto)
        .expect(401);
    });
  });
});
