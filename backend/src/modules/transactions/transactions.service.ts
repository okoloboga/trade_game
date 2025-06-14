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
import { TonService } from '../ton/ton.service';
import { AxiosError } from 'axios';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly challengeService: ChallengeService,
    private readonly tonService: TonService
  ) {}

  async processDeposit(depositDto: DepositDto) {
    const { userId, amount, txHash, tonProof, account, clientId } = depositDto;

    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    if (!clientId) {
      throw new BadRequestException('Client ID is required');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isProofValid = await this.challengeService.verifyTonProof(account, tonProof, clientId);
    if (!isProofValid) {
      throw new BadRequestException('Invalid TON proof');
    }

    const isTransactionValid = await this.verifyTonTransaction(user.ton_address, amount, txHash);
    if (!isTransactionValid) {
      throw new BadRequestException('Invalid transaction');
    }

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

    try {
      const txHash = await this.tonService.sendTon(user.ton_address, amount.toString());
      user.balance -= amount;
      await this.userRepository.save(user);

      this.logger.log(`Initiated withdrawal of ${amount} TON for user ${userId}, txHash: ${txHash}`);
      return { user, txHash };
    } catch (error) {
      this.logger.error(`Error withdrawing ${amount} TON: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to process withdrawal');
    }
  }

  private async verifyTonTransaction(tonAddress: string, amount: number, txHash: string): Promise<boolean> {
    try {
      return await this.tonService.verifyTransaction(tonAddress, amount.toString(), txHash);
    } catch (error) {
      this.logger.error(`Error verifying transaction ${txHash}: ${(error as AxiosError).message}`);
      return false;
    }
  }
}
