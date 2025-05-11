import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class DepositDto {
  @IsString()
  @IsNotEmpty()
  ton_tx_hash!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  userId!: string; // Добавлено для передачи ID из JWT
}
