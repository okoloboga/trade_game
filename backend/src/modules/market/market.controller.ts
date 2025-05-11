import { 
    Controller, 
    Get, 
    Query, 
    UseGuards, 
    HttpCode, 
    HttpStatus,
    BadRequestException
  } from '@nestjs/common';
import { MarketService } from './market.service';
import { CandlesDto } from './dto/candles.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('candles')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getCandles(@Query() candlesDto: CandlesDto) {
    return this.marketService.getCandles(candlesDto);
  }

  @Get('ticker')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTicker(@Query('instId') instId: string) {
    if (!instId) {
      throw new BadRequestException('instId is required');
    }
    const price = await this.marketService.getCurrentPrice(instId);
    return { instId, price };
  }
}
