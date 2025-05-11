import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsDto } from './dto/stats.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('trades')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTradeHistory(@Query() statsDto: StatsDto) {
    return this.statsService.getTradeHistory(statsDto);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSummary(@Query() statsDto: StatsDto) {
    return this.statsService.getSummary(statsDto);
  }
}
