import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as supertest from 'supertest';
import { TokensController } from '../tokens.controller';
import { TokensService } from '../tokens.service';
import { instance, mock, verify, when } from 'ts-mockito';
import {
  BadRequestException,
  NotFoundException,
  ExecutionContext,
} from '@nestjs/common';
import { WithdrawTokensDto } from '../dto/withdraw-tokens.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { User } from '../../../entities/user.entity';

describe('TokensController', () => {
  let app: INestApplication;

  const MockTokensService = mock<TokensService>();

  const mockUser: User = {
    id: '0:1234567890abcdef',
    ton_address: '0:1234567890abcdef',
    balance: 0,
    token_balance: 50,
  };

  const withdrawDto: WithdrawTokensDto = {
    userId: '0:1234567890abcdef',
    amount: 50,
  };

  beforeEach(async () => {
    jest.setTimeout(10000);
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TokensController],
      providers: [
        { provide: TokensService, useValue: instance(MockTokensService) },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest();
          request.user = { userId: withdrawDto.userId }; // Эмуляция авторизованного пользователя
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

  describe('POST /tokens/withdraw', () => {
    it('should withdraw tokens successfully', async () => {
      const response = { user: mockUser, txHash: 'mockedTxHash' };
      when(MockTokensService.withdrawTokens(withdrawDto)).thenResolve(response);

      const result = await supertest
        .default(app.getHttpServer())
        .post('/tokens/withdraw')
        .send(withdrawDto)
        .expect(200);

      expect(result.body).toEqual(response);
      verify(MockTokensService.withdrawTokens(withdrawDto)).once();
    });

    it('should throw BadRequestException for invalid amount', async () => {
      const invalidDto = { ...withdrawDto, amount: 0 };

      await supertest
        .default(app.getHttpServer())
        .post('/tokens/withdraw')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw BadRequestException for missing userId', async () => {
      const invalidDto = { ...withdrawDto, userId: '' };

      await supertest
        .default(app.getHttpServer())
        .post('/tokens/withdraw')
        .send(invalidDto)
        .expect(400);
    });

    it('should throw NotFoundException if user not found', async () => {
      when(MockTokensService.withdrawTokens(withdrawDto)).thenReject(
        new NotFoundException('User not found')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/tokens/withdraw')
        .send(withdrawDto)
        .expect(404);
    });

    it('should throw BadRequestException for insufficient balance', async () => {
      when(MockTokensService.withdrawTokens(withdrawDto)).thenReject(
        new BadRequestException('Insufficient token balance')
      );

      await supertest
        .default(app.getHttpServer())
        .post('/tokens/withdraw')
        .send(withdrawDto)
        .expect(400);
    });
  });
});
