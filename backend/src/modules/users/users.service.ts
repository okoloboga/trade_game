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
   * Retrieves the balance of a user, fetching the main balance from the on-chain contract.
   * @param tonAddress - The TON address of the user.
   * @returns {Promise<{ balance: number, usdt_balance: number, token_balance: number }>} User's balances (on-chain TON, off-chain USDT and tokens).
   * @throws {NotFoundException} If the user is not found.
   */
  async getBalance(tonAddress: string) {
    const user = await this.userRepository.findOne({
      where: { ton_address: tonAddress },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch on-chain balance from the smart contract
    const onChainBalanceNano = await this.tonService.getBalance(tonAddress);
    const onChainBalance = Number(onChainBalanceNano) / 1e9; // Convert from nanoTON to TON

    const balances = {
      balance: onChainBalance,
      usdt_balance: Number(user.usdt_balance),
      token_balance: Number(user.token_balance),
    };
    this.logger.log(
      `Fetched balances for ton_address ${tonAddress}: on-chain balance=${balances.balance}, usdt_balance=${balances.usdt_balance}, token_balance=${balances.token_balance}`,
    );
    return balances;
  }
}
