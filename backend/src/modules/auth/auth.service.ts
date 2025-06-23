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
    const { ton_address, tonProof, account, clientId } = authDto;

    if (!clientId) {
      throw new UnauthorizedException('Client ID is required');
    }

    const isValid = await this.challengeService.verifyTonProof(account, tonProof, clientId);
    if (!isValid) {
      throw new UnauthorizedException('Invalid TON Proof');
    }

    let user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      const newUser: Partial<User> = {
        ton_address,
        balance: 0.0,
        usdt_balance: 0.0,
        token_balance: 0.0,
      };
      user = this.userRepository.create(newUser);
      await this.userRepository.save(user);
    }

    const payload = { sub: user.id, ton_address: user.ton_address };
    const token = await this.jwtService.signAsync(payload);

    return { access_token: token, user };
  }
}
