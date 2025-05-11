import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';
import { TokensService } from '../tokens/tokens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Trade } from '../../entities/trade.entity';
import { User } from '../../entities/user.entity';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MarketService } from '../market/market.service';
import { MarketGateway } from '../market/market.gateway';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    TypeOrmModule.forFeature([Trade, User]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
  ],
  controllers: [TradesController],
  providers: [TradesService, TokensService, MarketService, MarketGateway],
  exports: [TradesService],
})
export class TradesModule {}
