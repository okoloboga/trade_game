import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envConfig } from './common/config/env.config';
import { postgresConfig } from './common/config/postgres.config';
import { RedisConfigModule } from './common/config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { MarketModule } from './modules/market/market.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { TradesModule } from './modules/trades/trades.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { StatsModule } from './modules/stats/stats.module';
import { ChallengeModule } from './modules/challenge/challenge.module';
import { TonModule } from './modules/ton/ton.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.POSTGRES_URL,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      synchronize: false,
    }),
    envConfig,
    postgresConfig,
    RedisConfigModule,
    AuthModule,
    MarketModule,
    TransactionsModule,
    TradesModule,
    TokensModule,
    StatsModule,
    ChallengeModule,
    TonModule
  ],
  controllers: [HealthController],
})
export class AppModule {}
