import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { TradesService } from './trades.service';
import { PlaceTradeDto } from './dto/place-trade.dto';
import { CancelTradeDto } from './dto/cancel-trade.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post('place')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async placeTrade(@Body() placeTradeDto: PlaceTradeDto) {
    return this.tradesService.placeTrade(placeTradeDto);
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelTrade(@Body() cancelTradeDto: CancelTradeDto) {
    return this.tradesService.cancelTrade(cancelTradeDto);
  }
}
