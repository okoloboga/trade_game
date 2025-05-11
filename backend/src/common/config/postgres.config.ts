import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { Transaction } from '../../entities/transaction.entity';
import { Trade } from '../../entities/trade.entity';
import { Token } from '../../entities/token.entity';

export const postgresConfig = TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url: configService.get<string>('POSTGRES_URL'),
    entities: [User, Transaction, Trade, Token],
    synchronize: configService.get<string>('NODE_ENV') === 'development', // Только для разработки
    logging: ['error', 'warn'],
  }),
  inject: [ConfigService],
});
