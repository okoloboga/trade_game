import { IsString, IsNotEmpty, IsNumber, Min, IsIn } from 'class-validator';

export class PlaceTradeDto {
  @IsString()
  @IsNotEmpty()
  instrument!: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['buy', 'sell'])
  type!: 'buy' | 'sell';

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  userId!: string;
}
