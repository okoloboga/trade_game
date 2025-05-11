import { IsString, IsNotEmpty } from 'class-validator';

export class StatsDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  period!: string;
}
