import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { ChallengeService } from '../challenge/challenge.service';
import { Address, toNano } from '@ton/core';
import { TonClient4 } from 'ton';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private client: TonClient4;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly challengeService: ChallengeService,
    private readonly configService: ConfigService
  ) {
    const tonEndpoint =
      this.configService.get<string>('TON_ENDPOINT') ||
      'https://mainnet-v4.tonhubapi.com';
    this.client = new TonClient4({ endpoint: tonEndpoint });
  }

  async processDeposit(depositDto: DepositDto) {
    const { userId, amount, txHash, tonProof, account } = depositDto;

    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify TON proof
    const isProofValid = await this.challengeService.verifyTonProof(
      account,
      tonProof
    );
    if (!isProofValid) {
      throw new BadRequestException('Invalid TON proof');
    }

    // Verify transaction
    const isTransactionValid = await this.verifyTonTransaction(
      user.ton_address,
      amount,
      txHash
    );
    if (!isTransactionValid) {
      throw new BadRequestException('Invalid transaction');
    }

    // Update user balance
    user.balance += amount;
    await this.userRepository.save(user);

    this.logger.log(`Processed deposit of ${amount} TON for user ${userId}`);
    return { user, status: 'confirmed' };
  }

  async processWithdraw(withdrawDto: WithdrawDto) {
    const { userId, amount } = withdrawDto;

    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Placeholder for TON withdrawal
    user.balance -= amount;
    await this.userRepository.save(user);

    this.logger.log(`Processed withdrawal of ${amount} TON for user ${userId}`);
    return { user, status: 'pending' };
  }

  private async verifyTonTransaction(
    tonAddress: string,
    amount: number,
    txHash: string
  ): Promise<boolean> {
    try {
      // Fetch account state
      const address = Address.parse(tonAddress);
      const lastBlock = await this.client.getLastBlock();
      const accountLite = await this.client.getAccountLite(
        lastBlock.last.seqno,
        address
      );

      // Simplified check: verify if last transaction hash matches
      if (
        !accountLite.account.last ||
        accountLite.account.last.hash !== txHash
      ) {
        this.logger.error(
          `Transaction ${txHash} not found for address ${tonAddress}`
        );
        return false;
      }

      // Verify amount (approximate, as we don't have full tx details)
      const expectedAmount = toNano(amount.toString());
      const accountBalance = BigInt(accountLite.account.balance.coins);
      if (accountBalance < expectedAmount) {
        this.logger.error(
          `Account balance ${accountBalance} less than expected ${expectedAmount}`
        );
        return false;
      }

      this.logger.log(
        `Verified transaction ${txHash} for address ${tonAddress}`
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error verifying transaction ${txHash}: ${(error as AxiosError).message}`
      );
      return false;
    }
  }
}
