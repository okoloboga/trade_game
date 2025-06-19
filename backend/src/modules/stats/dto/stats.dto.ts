import { IsString, IsNotEmpty } from 'class-validator';

export class StatsDto {
  @IsString()
  @IsNotEmpty()
  ton_address!: string;

  @IsString()
  @IsNotEmpty()
  period!: string;
}
