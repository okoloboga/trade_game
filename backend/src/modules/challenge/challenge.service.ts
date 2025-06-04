import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell } from '@ton/core';
import { TonService } from '../ton/ton.service';
// import { ConfigService } from '@nestjs/config';
import { TonProof, Account } from 'src/types/ton.types';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);
  private challenges = new Map<
    string,
    { challenge: string; validUntil: number }
  >();

  constructor(
    // private readonly configService: ConfigService,
    private readonly tonService: TonService
  ) {}

  // Генерация челленджа для TON Proof
  async generateChallenge(address: string): Promise<{ challenge: string; validUntil: number }> {
    const challenge = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 1000 * 60 * 10; // 10 минут
    this.challenges.set(address, { challenge, validUntil });
    this.logger.log(`Generated challenge for ${address}: ${challenge}`);
    return { challenge, validUntil };
  }

  // Проверка TON Proof
 async verifyTonProof(account: Account, tonProof: TonProof): Promise<boolean> {
    // Проверяем наличие необходимых данных
    if (!account || !account.address || !account.publicKey || !account.walletStateInit || !tonProof || !tonProof.proof) {
      this.logger.error('Invalid account or proof data');
      throw new BadRequestException('Invalid account or proof data');
    }

    // Формируем payload для верификации
    const payload = {
      address: account.address,
      public_key: account.publicKey,
      proof: {
        ...tonProof.proof,
        state_init: account.walletStateInit,
      },
    };

    this.logger.log(`Verifying TON Proof. Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      const stateInitCell = Cell.fromBoc(Buffer.from(payload.proof.state_init, 'base64'))[0];
      // const stateInit = stateInitCell.beginParse();
      this.logger.log('stateInit parsed successfully');

      const client = this.tonService['client'];
      if (!client) {
        this.logger.error('TON client not initialized');
        throw new BadRequestException('TON client not initialized');
      }

      const address = Address.parse(payload.address);
      let publicKey: Buffer;

      try {
        const result = await client.runMethod(address, 'get_public_key', []);
        publicKey = Buffer.from(result.stack.readBigNumber().toString(16).padStart(64, '0'), 'hex');
        this.logger.log(`Retrieved public key: ${publicKey.toString('hex')}`);
      } catch (error) {
        this.logger.log('get_public_key failed, using state_init for verification');

        const publicKeyFromStateInit = Buffer.from(payload.public_key, 'hex');
        if (!publicKeyFromStateInit || publicKeyFromStateInit.length !== 32) {
          this.logger.error('Invalid public key from state_init');
          return false;
        }

        const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
        if (!publicKeyFromStateInit.equals(wantedPublicKey)) {
          this.logger.error('Public keys do not match');
          return false;
        }

        const wantedAddress = Address.parse(payload.address);
        const stateInitHash = stateInitCell.hash();
        const addressFromStateInit = new Address(wantedAddress.workChain, stateInitHash);
        if (!addressFromStateInit.equals(wantedAddress)) {
          this.logger.error('Addresses do not match');
          return false;
        }

        const now = Math.floor(Date.now() / 1000);
        if (now - 15 * 60 > payload.proof.timestamp) {
          this.logger.error('Proof is too old');
          return false;
        }

        return true;
      }

      if (!publicKey || publicKey.length !== 32) {
        this.logger.error('Invalid public key from blockchain');
        return false;
      }

      const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
      if (!publicKey.equals(wantedPublicKey)) {
        this.logger.error('Public keys do not match');
        return false;
      }

      const wantedAddress = Address.parse(payload.address);
      const stateInitHash = stateInitCell.hash();
      const addressFromStateInit = new Address(wantedAddress.workChain, stateInitHash);
      if (!addressFromStateInit.equals(wantedAddress)) {
        this.logger.error('Addresses do not match');
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - 15 * 60 > payload.proof.timestamp) {
        this.logger.error('Proof is too old');
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(`Failed to verify TON Proof: ${(error as Error).message}`);
      return false;
    }
  }
}
