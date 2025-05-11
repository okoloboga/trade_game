import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';
import { Transaction } from './entities/transaction.entity';
import { Trade } from './entities/trade.entity';
import { Token } from './entities/token.entity';

const configService = new ConfigService();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: configService.get('POSTGRES_URL'),
  entities: [User, Transaction, Trade, Token],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
