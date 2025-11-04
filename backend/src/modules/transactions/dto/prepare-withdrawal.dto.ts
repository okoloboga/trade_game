import { IsNumber, IsPositive } from 'class-validator';

export class PrepareWithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount!: number;
}
