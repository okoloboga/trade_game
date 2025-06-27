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

  /**
   * Initializes TokensService with dependencies.
   * @param userRepository - Repository for User entity.
   * @param marketService - Service for fetching market data.
   * @param redis - Redis client for caching.
   * @param tonService - Service for TON blockchain interactions.
   */
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
      this.logger.log(`Daily token limit reached for user ${user.id}`);
      return 0;
    }

    const newTokens = Math.min(tokensToAccrue, 10 - dailyTokens);
    if (newTokens > 0) {
      try {
        await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
          this.logger.log(`Before update: user ${user.id}, token_balance: ${user.token_balance}`);
          await transactionalEntityManager.update(
            User,
            { id: user.id },
            { token_balance: () => `token_balance + ${newTokens}` },
          );
          await this.redis.set(
            dailyTokensKey,
            (dailyTokens + newTokens).toString(),
            'EX',
            24 * 60 * 60,
          );
          const savedUser = await transactionalEntityManager.findOne(User, { where: { id: user.id } });
          this.logger.log(`After save in transaction: user ${user.id}, token_balance: ${savedUser?.token_balance}`);
        });
        const updatedUser = await this.userRepository.findOne({ where: { id: user.id }, cache: false });
        this.logger.log(`Accrued ${newTokens} RUBLE tokens to user ${user.id}, new token_balance: ${updatedUser?.token_balance}`);
      } catch (error) {
        this.logger.error(`Failed to accrue ${newTokens} RUBLE tokens for user ${user.id}: ${(error as AxiosError).stack}`);
        throw new BadRequestException('Failed to accrue tokens');
      }
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

    if (amount <= 0 || isNaN(amount)) {
      throw new BadRequestException('Amount must be a positive number');
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
      await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
        await transactionalEntityManager.update(
          User,
          { id: userId },
          { token_balance: () => `token_balance - ${amount}` },
        );
      });
      const updatedUser = await this.userRepository.findOne({ where: { id: userId }, cache: false });
      this.logger.log(`Withdrew ${amount} RUBLE tokens for user ${userId}, new token_balance: ${updatedUser?.token_balance}, txHash: ${txHash}`);
      return { user: updatedUser || user, txHash };
    } catch (error) {
      this.logger.error(`Error withdrawing ${amount} RUBLE for user ${userId}: ${(error as AxiosError).stack}`);
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
      if (!price || price <= 0) {
        throw new Error('Invalid TON price');
      }
      await this.redis.set(cacheKey, price, 'EX', 300);
      return price;
    } catch (error) {
      this.logger.error(`Failed to fetch TON price: ${(error as AxiosError).stack}`);
      const fallbackPrice = parseFloat((await this.redis.get('ton_price_usd_fallback')) || '5.0');
      await this.redis.set('ton_price_usd_fallback', fallbackPrice.toString(), 'EX', 24 * 60 * 60);
      return fallbackPrice;
    }
  }
}
