import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class DepositDto {
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
