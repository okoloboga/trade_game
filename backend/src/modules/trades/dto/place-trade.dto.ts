import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class PlaceTradeDto {
  @IsString()
  @IsNotEmpty()
  instrument!: string;

  @IsString()
  @IsNotEmpty()
  type!: 'buy' | 'sell';

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  ton_address!: string;
}
