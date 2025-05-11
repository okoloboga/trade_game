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

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawTokens(@Body() withdrawTokensDto: WithdrawTokensDto) {
    return this.tokensService.withdrawTokens(withdrawTokensDto);
  }
}
