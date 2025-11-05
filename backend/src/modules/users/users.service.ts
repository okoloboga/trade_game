import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { TonService } from '../ton/ton.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tonService: TonService,
  ) {}

  /**
   * Retrieves the balance of a user.
   * For TON balance: uses trading balance from DB (user.balance) which is virtual for trading.
   * On-chain balance is only used for deposits/withdrawals.
   * @param tonAddress - The TON address of the user.
   * @returns {Promise<{ balance: number, usdt_balance: number, token_balance: number }>} User's balances (trading TON from DB, off-chain USDT and tokens).
   * @throws {NotFoundException} If the user is not found.
   */
  async getBalance(tonAddress: string) {
    const user = await this.userRepository.findOne({
      where: { ton_address: tonAddress },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch on-chain balance from the smart contract for reference
    const onChainBalanceNano = await this.tonService.getBalance(tonAddress);
    const onChainBalance = Number(onChainBalanceNano) / 1e9; // Convert from nanoTON to TON

    // Use trading balance from DB (virtual balance for trading)
    // Sync only if trading balance is null/undefined (not initialized) - not if it's 0 or less than on-chain (that's normal after trading)
    let tradingBalance = Number(user.balance || 0);
    if (user.balance === null || user.balance === undefined) {
      // Sync trading balance with on-chain balance only on first initialization
      tradingBalance = onChainBalance;
      user.balance = tradingBalance;
      await this.userRepository.save(user);
      this.logger.log(
        `Synced trading balance for ton_address ${tonAddress}: ${tradingBalance} TON (from on-chain: ${onChainBalance})`
      );
    }

    const balances = {
      balance: tradingBalance,
      usdt_balance: Number(user.usdt_balance),
      token_balance: Number(user.token_balance),
    };
    this.logger.log(
      `Fetched balances for ton_address ${tonAddress}: trading balance=${balances.balance} (on-chain=${onChainBalance}), usdt_balance=${balances.usdt_balance}, token_balance=${balances.token_balance}`,
    );
    return balances;
  }
}
