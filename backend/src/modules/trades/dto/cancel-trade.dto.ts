import { IsString, IsNotEmpty } from 'class-validator';

export class CancelTradeDto {
  @IsString()
  @IsNotEmpty()
  tradeId!: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
