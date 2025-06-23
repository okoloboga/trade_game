import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradeDto } from './dto/trade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post('buy')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async buyTrade(@Body() tradeDto: TradeDto) {
    return this.tradesService.buyTrade(tradeDto);
  }

  @Post('sell')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async sellTrade(@Body() tradeDto: TradeDto) {
    return this.tradesService.sellTrade(tradeDto);
  }
}
