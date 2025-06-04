import { Module } from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { ChallengeController } from './challenge.controller';
import { ConfigModule } from '@nestjs/config';
import { TonModule } from '../ton/ton.module';

@Module({
  imports: [ConfigModule, TonModule],
  providers: [ChallengeService],
  controllers: [ChallengeController],
  exports: [ChallengeService],
})
export class ChallengeModule {}
