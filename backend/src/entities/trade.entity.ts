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
  instrument!: string; // Например, BTC-USD

  @Column({ type: 'varchar' })
  type!: 'buy' | 'sell';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount!: number; // Сумма в TON

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  entry_price!: number; // Цена входа

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  exit_price!: number | null; // Цена выхода (null, если сделка активна)

  @Column({ type: 'varchar' })
  status!: 'open' | 'closed' | 'canceled';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  created_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  closed_at!: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profit_loss!: number; // Прибыль/убыток в TON
}
