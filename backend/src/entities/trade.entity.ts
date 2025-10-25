import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('trades')
export class Trade {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @Index('idx_trades_user_id')
  user!: User;

  @Column({ type: 'varchar' })
  instrument!: string; // Например, TON-USDT

  @Column({ type: 'varchar' })
  type!: 'buy' | 'sell';

  @Column({ type: 'decimal', precision: 10, scale: 5 })
  amount!: number; // TON

  @Column({ type: 'decimal', precision: 10, scale: 5 })
  usdt_price!: number; // Курс TON/USDT на момент сделки

  @Column({ type: 'decimal', precision: 10, scale: 5, default: 0 })
  profit_loss!: number; // USD

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  type_created_at!: string; // Для поиска предыдущей buy
}
