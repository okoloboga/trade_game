import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AuthDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { verifyMessage } from '@ton/ton';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(authDto: AuthDto) {
    const { ton_address, signature, message } = authDto;

    // Проверка подписи через Ton Connect
    const isValid = await this.verifyTonSignature(ton_address, signature, message);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Поиск или создание пользователя
    let user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      const newUser: Partial<User> = {
      ton_address, 
      balance: 0.00, 
      token_balance: 0.00 
      };
      user = this.userRepository.create(newUser);
      await this.userRepository.save(user);
    }

    // Генерация JWT
    const payload = { sub: user.id, ton_address: user.ton_address };
    const token = await this.jwtService.signAsync(payload);

    return { access_token: token, user };
  }

  async verifyTonSignature(ton_address: string, signature: string, message: string): Promise<boolean> {
    try {
      // Проверка подписи с использованием библиотеки @ton/ton
      return verifyMessage(message, signature, ton_address);
    } catch (error) {
      return false;
    }
  }
}
