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
import { TonModule } from '../ton/ton.module';
import { TokensModule } from '../tokens/tokens.module';
import { TransactionsModule } from '../transactions/transactions.module';


@Module({
  imports: [
    ConfigModule,
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),
    TypeOrmModule.forFeature([Trade, User]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
    TonModule,
    TokensModule,
    TransactionsModule,
  ],
  controllers: [TradesController],
  providers: [TradesService, TokensService, MarketService, MarketGateway],
  exports: [TradesService],
})
export class TradesModule {}
