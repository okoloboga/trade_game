import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { DepositAccount } from 'src/types/ton.types';

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

  @IsNotEmpty()
  account!: DepositAccount;  

  @IsString()
  @IsNotEmpty()
  clientId!: string;
}
