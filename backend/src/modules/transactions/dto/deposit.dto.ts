import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';
import { TonProof, Account } from 'src/types/ton.types';

export class DepositDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  txHash!: string;

  @IsNotEmpty()
  tonProof!: TonProof;

  @IsNotEmpty()
  account!: Account;

  @IsString()
  @IsNotEmpty()
  clientId!: string;
}
