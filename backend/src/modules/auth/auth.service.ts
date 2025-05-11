import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { AuthDto } from './dto/auth.dto';
import { JwtService } from '@nestjs/jwt';
import { ChallengeService } from '../challenge/challenge.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly challengeService: ChallengeService
  ) {}

  async login(authDto: AuthDto) {
    const { ton_address, tonProof, account } = authDto;

    // Проверка подписи через TON Proof
    const isValid = await this.challengeService.verifyTonProof(
      account,
      tonProof
    );
    if (!isValid) {
      throw new UnauthorizedException('Invalid TON Proof');
    }

    // Поиск или создание пользователя
    let user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      const newUser: Partial<User> = {
        ton_address,
        balance: 0.0,
        token_balance: 0.0,
      };
      user = this.userRepository.create(newUser);
      await this.userRepository.save(user);
    }

    // Генерация JWT
    const payload = { sub: user.id, ton_address: user.ton_address };
    const token = await this.jwtService.signAsync(payload);

    return { access_token: token, user };
  }
}
