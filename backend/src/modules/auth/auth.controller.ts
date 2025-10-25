import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() authDto: AuthDto) {
    return this.authService.login(authDto);
  }

  @Get('verify')
  @HttpCode(HttpStatus.OK)
  async verify(@Headers('Authorization') authHeader: string) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid token');
    }
    const token = authHeader.replace('Bearer ', '');
    const payload = await this.authService.verifyToken(token);
    return { valid: true, user: payload };
  }
}
