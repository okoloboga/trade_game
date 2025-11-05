import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class WithdrawDto {
  @IsString()
  @IsNotEmpty()
  tonAddress!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  txHash!: string;
}
