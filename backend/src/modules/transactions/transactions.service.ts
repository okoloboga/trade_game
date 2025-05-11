import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);
  private readonly maxAmountUsd = 10; // Максимум $10
  private readonly okxApiUrl = 'https://www.okx.com/api/v5';

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async processDeposit(depositDto: DepositDto) {
    const { ton_tx_hash, amount } = depositDto;

    // Проверка транзакции TON (заглушка, нужно адаптировать)
    const isValidTx = await this.verifyTonTransaction(ton_tx_hash, amount);
    if (!isValidTx) {
      throw new BadRequestException('Invalid TON transaction');
    }

    // Конвертация TON в USD
    const tonPriceUsd = await this.getTonPrice();
    const amountUsd = amount * tonPriceUsd;
    if (amountUsd > this.maxAmountUsd) {
      throw new BadRequestException(`Deposit exceeds $${this.maxAmountUsd} limit`);
    }

    // Получение пользователя из JWT
    const user = await this.userRepository.findOne({ where: { id: depositDto.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Создание транзакции
    const transaction = this.transactionRepository.create({
      user,
      type: 'deposit',
      amount,
      ton_tx_hash,
      status: 'completed',
    });
    await this.transactionRepository.save(transaction);

    // Обновление баланса
    user.balance += amount;
    await this.userRepository.save(user);

    this.logger.log(`Deposit processed: ${amount} TON for user ${user.id}`);
    return { transaction, user };
  }

  async processWithdraw(withdrawDto: WithdrawDto) {
    const { amount, ton_address } = withdrawDto;

    // Конвертация TON в USD
    const tonPriceUsd = await this.getTonPrice();
    const amountUsd = amount * tonPriceUsd;
    if (amountUsd > this.maxAmountUsd) {
      throw new BadRequestException(`Withdrawal exceeds $${this.maxAmountUsd} limit`);
    }

    // Получение пользователя
    const user = await this.userRepository.findOne({ where: { id: withdrawDto.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Проверка баланса
    if (user.balance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    // Создание транзакции
    const transaction = this.transactionRepository.create({
      user,
      type: 'withdraw',
      amount,
      ton_tx_hash: 'pending',
      status: 'pending',
    });
    await this.transactionRepository.save(transaction);

    // Обновление баланса
    user.balance -= amount;
    await this.userRepository.save(user);

    this.logger.log(`Withdrawal initiated: ${amount} TON for user ${user.id}`);
    return { transaction, user };
  }

  private async verifyTonTransaction(txHash: string, amount: number): Promise<boolean> {
    this.logger.log(`Verifying TON transaction: ${txHash}, amount: ${amount}`);
    return true; // Заменить на реальную проверку
  }

  private async getTonPrice(): Promise<number> {
    const cacheKey = 'ton_price_usd';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return parseFloat(cached);
    }

    try {
      const response = await axios.get(`${this.okxApiUrl}/market/ticker`, {
        params: {
          instId: 'TON-USDT',
        },
        headers: {
          'OK-ACCESS-KEY': this.configService.get<string>('OKX_API_KEY'),
        },
      });

      const price = parseFloat(response.data.data[0].last);
      await this.redis.set(cacheKey, price, 'EX', 300); // Кэш на 5 минут
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch TON price: ${(error as AxiosError).message}`);
      return 5.0; // Fallback-цена
    }
  }
}
