import { IsString, IsNotEmpty } from 'class-validator';

export class CandlesDto {
  @IsString()
  @IsNotEmpty()
  instId!: string;

  @IsString()
  @IsNotEmpty()
  bar!: string;
}
