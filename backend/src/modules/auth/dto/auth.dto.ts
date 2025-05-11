import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { TonProof, Account } from 'src/types/ton.types';

export class AuthDto {
  @IsString()
  @IsNotEmpty()
  ton_address!: string;

  @IsObject()
  @IsNotEmpty()
  tonProof!: TonProof; // Объект TON Proof с proof { timestamp, domain, signature, payload }

  @IsObject()
  @IsNotEmpty()
  account!: Account; // Объект аккаунта с address, publicKey, chain
}
