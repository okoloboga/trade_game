import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

@Module({
  imports: [
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('REDIS_URL'),
        options: {
          retryStrategy: (times: number) => Math.min(times * 50, 2000),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class RedisConfigModule {}
