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
import { TonService } from '../ton/ton.service';
// import { AxiosError } from 'axios';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tonService: TonService
  ) {}

  async processDeposit(depositDto: DepositDto) {
    const { tonAddress, amount, txHash } = depositDto;

    this.logger.log(`Deposit data: ${JSON.stringify({ tonAddress, amount, txHash }, null, 2)}`);

    if (amount <= 0) {
      throw new BadRequestException('Invalid amount');
    }

    const user = await this.userRepository.findOne({ where: { ton_address: tonAddress } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const depositAmount = Number(amount);
    user.balance = Number(user.balance || 0) + depositAmount;
    this.logger.log(`Before save: user.balance=${user.balance}, depositAmount=${depositAmount}`);
    await this.userRepository.save(user);

    this.logger.log(`Processed deposit of ${depositAmount} TON for user ${tonAddress}`);
    return { user: { ...user, balance: user.balance }, status: 'confirmed' };
  }

  async processWithdraw(withdrawDto: WithdrawDto) {
    const { tonAddress, amount } = withdrawDto;
    const fee = 0.1;
    const transferAmount = amount - fee;

    if (amount < 0.11) {
      throw new BadRequestException('Amount must be at least 0.11 TON (including 0.1 TON fee)');
    }

    if (transferAmount <= 0) {
      throw new BadRequestException('Invalid amount after fee deduction');
    }

    const user = await this.userRepository.findOne({ where: { ton_address: tonAddress } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    try {
      const txHash = await this.tonService.sendTon(tonAddress, transferAmount.toString());
      user.balance = Number(user.balance || 0) - amount;
      await this.userRepository.save(user);

      this.logger.log(`Initiated withdrawal of ${amount} TON (transfer: ${transferAmount} TON, fee: ${fee} TON) for user ${tonAddress}, txHash: ${txHash}`);
      return { user, txHash, fee };
    } catch (error) {
      this.logger.error(`Error withdrawing ${amount} TON: ${(error as Error).message}`);
      throw new BadRequestException(`Failed to process withdrawal: ${(error as Error).message}`);
    }
  }
}
