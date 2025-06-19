import { Module } from '@nestjs/common';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Trade } from '../../entities/trade.entity';
import { Transaction } from '../../entities/transaction.entity'; // Добавляем Transaction
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MarketService } from '../market/market.service';
import { MarketGateway } from '../market/market.gateway';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),
    TypeOrmModule.forFeature([User, Trade, Transaction]), // Добавляем Transaction
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
  ],
  controllers: [StatsController],
  providers: [StatsService, MarketService, MarketGateway],
  exports: [StatsService],
})
export class StatsModule {}
