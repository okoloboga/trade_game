import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Retrieves the balance of a user by their TON address.
   * @param tonAddress - The TON address of the user.
   * @returns {Promise<{ balance: number, usdt_balance: number, token_balance: number }>} User's balances (TON, USDT, and tokens).
   * @throws {NotFoundException} If the user is not found.
   */
  async getBalance(tonAddress: string) {
    const user = await this.userRepository.findOne({ where: { ton_address: tonAddress } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { 
        balance: Number(user.balance), 
        usdt_balance: Number(user.usdt_balance),
        token_balance: Number(user.token_balance) 
    };
  }
}
