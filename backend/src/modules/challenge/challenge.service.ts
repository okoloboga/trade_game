import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell } from '@ton/core';
import { TonService } from '../ton/ton.service';
import { TonProof, Account } from 'src/types/ton.types';
// import { signVerify } from '@ton/crypto';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);
  private challenges = new Map<string, { challenge: string; validUntil: number }>();

  constructor(private readonly tonService: TonService) {}

  async generateChallenge(address: string): Promise<{ challenge: string; validUntil: number }> {
    const challenge = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 1000 * 60 * 10; // 10 минут
    this.challenges.set(address, { challenge, validUntil });
    this.logger.log(`Generated challenge for ${address}: ${challenge}`);
    return { challenge, validUntil };
  }

  async verifyTonProof(account: Account, tonProof: TonProof): Promise<boolean> {
    if (!account || !account.address || !account.publicKey || !account.walletStateInit || !tonProof || !tonProof.proof) {
      this.logger.error('Invalid account or proof data');
      throw new BadRequestException('Invalid account or proof data');
    }

    const stored = this.challenges.get(account.address);
    if (!stored || stored.validUntil < Date.now()) {
      this.logger.error('Challenge expired or not found');
      throw new BadRequestException('Challenge expired or not found');
    }

    if (tonProof.proof.payload !== stored.challenge) {
      this.logger.error(`Invalid proof payload: received ${tonProof.proof.payload}, expected ${stored.challenge}`);
      throw new BadRequestException('Invalid proof payload');
    }

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
          throw new BadRequestException('Invalid public key');
        }

        const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
        if (!publicKeyFromStateInit.equals(wantedPublicKey)) {
          this.logger.error('Public keys do not match');
          throw new BadRequestException('Public keys do not match');
        }

        const wantedAddress = Address.parse(payload.address);
        const stateInitHash = stateInitCell.hash();
        const addressFromStateInit = new Address(wantedAddress.workChain, stateInitHash);
        if (!addressFromStateInit.equals(wantedAddress)) {
          this.logger.error('Addresses do not match');
          throw new BadRequestException('Addresses do not match');
        }

        const now = Math.floor(Date.now() / 1000);
        if (now - 15 * 60 > payload.proof.timestamp) {
          this.logger.error('Proof is too old');
          throw new BadRequestException('Proof is too old');
        }

        this.challenges.delete(account.address);
        return true;
      }

      if (!publicKey || publicKey.length !== 32) {
        this.logger.error('Invalid public key from blockchain');
        throw new BadRequestException('Invalid public key');
      }

      const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
      if (!publicKey.equals(wantedPublicKey)) {
        this.logger.error('Public keys do not match');
        throw new BadRequestException('Public keys do not match');
      }

      const wantedAddress = Address.parse(payload.address);
      const stateInitHash = stateInitCell.hash();
      const addressFromStateInit = new Address(wantedAddress.workChain, stateInitHash);
      if (!addressFromStateInit.equals(wantedAddress)) {
        this.logger.error('Addresses do not match');
        throw new BadRequestException('Addresses do not match');
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - 15 * 60 > payload.proof.timestamp) {
        this.logger.error('Proof is too old');
        throw new BadRequestException('Proof is too old');
      }

      this.challenges.delete(account.address);
      return true;
    } catch (error) {
      this.logger.error(`Failed to verify TON Proof: ${(error as Error).message}`);
      throw new BadRequestException('Invalid account or proof data');
    }
  }
}
