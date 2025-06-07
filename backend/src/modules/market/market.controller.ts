import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { MarketService } from './market.service';
import { CandlesDto } from './dto/candles.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('candles')
  @Public() // Используйте этот декоратор вместо @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCandles(@Query() candlesDto: CandlesDto) {
    return this.marketService.getCandles(candlesDto);
  }

  @Get('ticker')
  @Public() // Используйте этот декоратор вместо @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTicker(@Query('instId') instId: string) {
    if (!instId) {
      throw new BadRequestException('instId is required');
    }
    const price = await this.marketService.getCurrentPrice(instId);
    return { instId, price };
  }
}
