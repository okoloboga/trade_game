import { IsString, IsNotEmpty, IsNumber, IsPositive, Max } from 'class-validator';

export class TradeDto {
  @IsString()
  @IsNotEmpty()
  ton_address!: string;

  @IsNumber()
  @IsPositive()
  @Max(10)
  amount!: number; // USD

  @IsString()
  @IsNotEmpty()
  symbol!: string; // Например, TON-USDT
}
