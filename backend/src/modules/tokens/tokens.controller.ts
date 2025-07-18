import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TokensService } from './tokens.service';
import { WithdrawTokensDto } from './dto/withdraw-tokens.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  /**
   * Initiates a withdrawal of RUBLE tokens.
   * @param withdrawTokensDto - DTO containing TON address and amount to withdraw.
   * @returns {Promise<{ user: User, txHash: string }>} Updated user data and transaction hash.
   */
  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawTokens(@Body() withdrawTokensDto: WithdrawTokensDto) {
    return this.tokensService.withdrawTokens(withdrawTokensDto);
  }
}
