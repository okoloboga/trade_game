import { Module } from '@nestjs/common';
import { TokensController } from './tokens.controller';
import { TokensService } from './tokens.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Trade } from '../../entities/trade.entity';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MarketService } from '../market/market.service';
import { MarketGateway } from '../market/market.gateway';
import { TonModule } from '../ton/ton.module';
import { MarketModule } from '../market/market.module';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule.forRoot({
      type: 'single',
      url: process.env.REDIS_URL,
    }),
    TypeOrmModule.forFeature([User, Trade]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
      }),
    }),
    TonModule,
    MarketModule,
    TransactionsModule,
  ],
  controllers: [TokensController],
  providers: [TokensService, MarketService, MarketGateway],
  exports: [TokensService],
})
export class TokensModule {}
