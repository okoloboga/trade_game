import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as supertest from 'supertest';
import { TransactionsController } from '../transactions.controller';
import { TransactionsService } from '../transactions.service';
import { instance, mock, verify, when } from 'ts-mockito';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DepositDto } from '../dto/deposit.dto';
import { WithdrawDto } from '../dto/withdraw.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User } from '../../../entities/user.entity';

describe('TransactionsController', () => {
  let app: INestApplication;

  const MockTransactionsService = mock<TransactionsService>();

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
      chain: '-239',
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
      controllers: [TransactionsController],
      providers: [
        {
          provide: TransactionsService,
          useValue: instance(MockTransactionsService),
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { userId: depositDto.userId };
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

  describe('POST /transactions/deposit', () => {
    it('should process deposit successfully', async () => {
      const response = { user: mockUser, status: 'confirmed' };
      when(MockTransactionsService.processDeposit(depositDto)).thenResolve(
        response
      );

      const result = await supertest
        .default(app.getHttpServer())
        .post('/transactions/deposit')
        .send(depositDto)
        .expect(200);

      expect(result.body).toEqual(response);
      verify(MockTransactionsService.processDeposit(depositDto)).once();
    });

    it('should throw BadRequestException for missing userId', async () => {
      const invalidDto = { ...depositDto, userId: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/deposit')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...depositDto, amount: 0 };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/deposit')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for missing txHash', async () => {
      const invalidDto = { ...depositDto, txHash: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/deposit')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for invalid tonProof', async () => {
      const invalidDto = { ...depositDto, tonProof: {} };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/deposit')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw NotFoundException if user not found', async () => {
      when(MockTransactionsService.processDeposit(depositDto)).thenReject(
        new NotFoundException('User not found')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/deposit')
        .send(depositDto)
        .expect(404);
    });
  });

  describe('POST /transactions/withdraw', () => {
    it('should process withdraw successfully', async () => {
      const response = { user: mockUser, status: 'pending' };
      when(MockTransactionsService.processWithdraw(withdrawDto)).thenResolve(
        response
      );

      const result = await supertest
        .default(app.getHttpServer())
        .post('/transactions/withdraw')
        .send(withdrawDto)
        .expect(200);

      expect(result.body).toEqual(response);
      verify(MockTransactionsService.processWithdraw(withdrawDto)).once();
    });

    it('should throw BadRequestException for missing userId', async () => {
      const invalidDto = { ...withdrawDto, userId: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/withdraw')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...withdrawDto, amount: 0 };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/withdraw')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for missing ton_address', async () => {
      const invalidDto = { ...withdrawDto, ton_address: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/withdraw')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      when(MockTransactionsService.processWithdraw(withdrawDto)).thenReject(
        new BadRequestException('Insufficient balance')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/transactions/withdraw')
        .send(withdrawDto)
        .expect(400);
    });
  });
});
