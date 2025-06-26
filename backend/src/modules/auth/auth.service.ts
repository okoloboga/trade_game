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

  /**
   * Authenticates a user using TON wallet credentials and generates a JWT token.
   * Creates a new user if none exists for the provided TON address.
   * @param authDto - Authentication data including TON address, proof, account, and client ID.
   * @returns {Promise<{ access_token: string, user: User }>} Object containing JWT token and user data.
   * @throws {UnauthorizedException} If client ID is missing or TON proof is invalid.
   */
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

  /**
   * Verifies a JWT token and retrieves the associated user.
   * @param token - JWT token to verify.
   * @returns {Promise<{ id: string, ton_address: string }>} User data if token is valid.
   * @throws {UnauthorizedException} If token is invalid or user not found.
   */
  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub, ton_address: payload.ton_address } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return { id: user.id, ton_address: user.ton_address };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
