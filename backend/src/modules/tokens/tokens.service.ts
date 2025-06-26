import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Trade } from '../../entities/trade.entity';
import { WithdrawTokensDto } from './dto/withdraw-tokens.dto';
import { MarketService } from '../market/market.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { TonService } from '../ton/ton.service';
import { AxiosError } from 'axios';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly marketService: MarketService,
    @InjectRedis() private readonly redis: Redis,
    private readonly tonService: TonService,
  ) {}

  /**
   * Accrues RUBLE tokens to a user based on their daily trading volume.
   * @param trade - The trade entity containing user and amount data.
   * @returns {Promise<number>} Number of tokens accrued (capped at 10 per day).
   */
  async accrueTokens(trade: Trade): Promise<number> {
    const user = trade.user;
    const tonPriceUsd = await this.getTonPrice();
    const tradeVolumeUsd = trade.amount * tonPriceUsd;

    const cacheKey = `daily_volume:${user.id}:${new Date().toISOString().split('T')[0]}`;
    const dailyVolume =
      parseFloat((await this.redis.get(cacheKey)) || '0') + tradeVolumeUsd;
    await this.redis.set(cacheKey, dailyVolume.toString(), 'EX', 24 * 60 * 60);

    const tokensToAccrue = Math.floor(dailyVolume / 10);
    const dailyTokensKey = `daily_tokens:${user.id}`;
    const dailyTokens = parseInt((await this.redis.get(dailyTokensKey)) || '0');

    if (dailyTokens >= 10) {
      return 0;
    }

    const newTokens = Math.min(tokensToAccrue, 10 - dailyTokens);
    if (newTokens > 0) {
      user.token_balance += newTokens;
      await this.userRepository.save(user);
      await this.redis.set(
        dailyTokensKey,
        (dailyTokens + newTokens).toString(),
        'EX',
        24 * 60 * 60
      );
    }

    return newTokens;
  }

  /**
   * Withdraws RUBLE tokens from a user's balance to their TON wallet.
   * @param withdrawTokensDto - DTO containing user ID and amount to withdraw.
   * @returns {Promise<{ user: User, txHash: string }>} Updated user data and transaction hash.
   * @throws {BadRequestException} If amount is invalid or insufficient balance.
   * @throws {NotFoundException} If user is not found.
   */
  async withdrawTokens(withdrawTokensDto: WithdrawTokensDto) {
    const { userId, amount } = withdrawTokensDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.token_balance < amount) {
      throw new BadRequestException('Insufficient token balance');
    }

    try {
      const txHash = await this.tonService.sendTokens(user.ton_address, amount.toString());
      user.token_balance -= amount;
      await this.userRepository.save(user);
      return { user, txHash };
    } catch (error) {
      this.logger.error(`Error withdrawing ${amount} RUBLE: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to process withdrawal');
    }
  }

  /**
   * Fetches the current TON price in USD, with caching.
   * @returns {Promise<number>} Current TON price in USD.
   */
  private async getTonPrice(): Promise<number> {
    const cacheKey = 'ton_price_usd';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return parseFloat(cached);
    }

    try {
      const response = await this.marketService.getCurrentPrice('TON-USDT');
      const price = response;
      await this.redis.set(cacheKey, price, 'EX', 300);
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch TON price: ${(error as AxiosError).message}`);
      return 5.0;
    }
  }
}
