import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Param('id') id: string) {
    return this.usersService.getBalance(id);
  }
}
