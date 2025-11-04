import {
  Controller,
  UseGuards,
  Post,
  Body,
  Request,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrepareWithdrawalDto } from './dto/prepare-withdrawal.dto';
import { DepositDto } from './dto/deposit.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('withdraw-prepare')
  async prepareWithdrawal(
    @Request() req: { user: { id: string } },
    @Body() dto: PrepareWithdrawalDto,
  ) {
    const userId = req.user.id; // Assuming userId is on req.user from JwtAuthGuard
    return this.transactionsService.prepareWithdrawal(userId, dto);
  }

  @Post('deposit')
  async processDeposit(
    @Request() req: { user: { id: string } },
    @Body() dto: DepositDto,
  ) {
    const userId = req.user.id;
    return this.transactionsService.processDeposit(userId, dto);
  }
}
