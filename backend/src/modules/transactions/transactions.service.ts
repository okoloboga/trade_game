import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Transaction } from '../../entities/transaction.entity';
import { TonService } from '../ton/ton.service';
import { PrepareWithdrawalDto } from './dto/prepare-withdrawal.dto';
import { DepositDto } from './dto/deposit.dto';
import { beginCell, toNano } from '@ton/core';
import { storeWithdraw } from '../../ton/wrappers/WalletContract';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly tonService: TonService,
    private readonly configService: ConfigService,
  ) {}

  async prepareWithdrawal(userId: string, dto: PrepareWithdrawalDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const onChainBalanceNano = await this.tonService.getBalance(user.ton_address);
    const onChainBalance = Number(onChainBalanceNano) / 1e9;

    if (onChainBalance < dto.amount) {
      throw new BadRequestException('Insufficient balance on the smart contract');
    }

    const amountInNano = toNano(dto.amount.toString());

    const body = beginCell()
      .store(storeWithdraw({ $$type: 'Withdraw', amount: amountInNano }))
      .endCell();

    // Используем те же параметры, что и в Deposit для консистентности
    const boc = body.toBoc({ idx: false, crc32: true }).toString('base64');
    const contractAddress = this.configService.get<string>('WALLET_CONTRACT_ADDRESS');

    return {
      boc,
      contractAddress,
    };
  }

  async processDeposit(userId: string, dto: DepositDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify that the tonAddress matches the user's address
    if (user.ton_address !== dto.tonAddress) {
      throw new BadRequestException('TON address mismatch');
    }

    // Check if transaction with this hash already exists
    const existingTransaction = await this.transactionRepository.findOne({
      where: {
        ton_tx_hash: dto.txHash,
        user: { id: userId },
      },
    });

    if (existingTransaction) {
      throw new BadRequestException('Transaction already processed');
    }

    // Create transaction record
    // Note: Balance is now stored on-chain in the smart contract,
    // so we only need to record the transaction in the database
    const transaction = this.transactionRepository.create({
      user: { id: userId },
      type: 'deposit',
      amount: dto.amount,
      ton_tx_hash: dto.txHash,
      status: 'completed', // Transactions are completed once sent to blockchain
    });

    await this.transactionRepository.save(transaction);

    this.logger.log(
      `Processed deposit for user ${userId}: ${dto.amount} TON, txHash: ${dto.txHash}`
    );

    return {
      user,
      transaction,
      status: 'completed',
    };
  }
}
