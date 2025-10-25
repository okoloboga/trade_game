import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from '../../entities/user.entity';
import { TonModule } from '../ton/ton.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), TonModule],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
