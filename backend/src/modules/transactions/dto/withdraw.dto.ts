import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  ton_address!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string; // Добавлено для передачи ID из JWT
}
