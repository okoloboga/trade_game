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
      .store(storeWithdraw({ $type: 'Withdraw', amount: amountInNano }))
      .endCell();

    const boc = body.toBoc().toString('base64');
    const contractAddress = this.configService.get<string>('WALLET_CONTRACT_ADDRESS');

    return {
      boc,
      contractAddress,
    };
  }
}
