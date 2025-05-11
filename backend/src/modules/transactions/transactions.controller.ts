import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DepositDto } from './dto/deposit.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deposit(@Body() depositDto: DepositDto) {
    return this.transactionsService.processDeposit(depositDto);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdraw(@Body() withdrawDto: WithdrawDto) {
    return this.transactionsService.processWithdraw(withdrawDto);
  }
}
