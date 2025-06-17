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

  async getBalance(tonAddress: string) {
    const user = await this.userRepository.findOne({ where: { ton_address: tonAddress } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { balance: Number(user.balance), token_balance: Number(user.token_balance) };
  }
}
