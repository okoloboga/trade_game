import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: string;

  @Index('idx_users_ton_address', { unique: true })
  @Column({ type: 'varchar', unique: true })
  ton_address!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  token_balance!: number;
}
