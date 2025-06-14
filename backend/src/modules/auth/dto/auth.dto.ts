import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { TonProof, Account } from 'src/types/ton.types';

export class AuthDto {
  @IsString()
  @IsNotEmpty()
  ton_address!: string;

  @IsObject()
  tonProof!: TonProof; // Объект TON Proof с proof { timestamp, domain, signature, payload }

  @IsObject()
  account!: Account; // Объект аккаунта с address, publicKey, chain

  @IsString()
  @IsNotEmpty()
  clientId!: string;
}
