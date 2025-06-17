import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':tonAddress/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Param('tonAddress') tonAddress: string) {
    return this.usersService.getBalance(tonAddress);
  }
}
