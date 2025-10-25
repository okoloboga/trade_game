import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from '../transactions.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../../entities/user.entity';
import { Transaction } from '../../../entities/transaction.entity';
import { TonService } from '../../ton/ton.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(User),
          useValue: {}, // Mock repository
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: {}, // Mock repository
        },
        {
          provide: TonService,
          useValue: {}, // Mock service
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TODO: Add new tests for the smart contract based withdrawal and deposit logic.
});
