import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Address, Cell, contractAddress, loadStateInit } from '@ton/core';
import { TonClient4 } from 'ton';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { TonProof, Account } from 'src/types/ton.types';

@Injectable()
export class ChallengeService {
  private readonly logger = new Logger(ChallengeService.name);
  private challenges = new Map<
    string,
    { challenge: string; validUntil: number }
  >();
  private client: TonClient4;

  constructor(private readonly configService: ConfigService) {
    const tonEndpoint =
      this.configService.get<string>('TON_ENDPOINT') ||
      'https://mainnet-v4.tonhubapi.com';
    this.client = new TonClient4({ endpoint: tonEndpoint });
  }

  generateChallenge(walletAddress: string): string {
    const challenge = randomBytes(32).toString('hex');
    const validUntil = Date.now() + 5 * 60 * 1000;

    const challengeData = { challenge, validUntil };
    this.challenges.set(walletAddress, challengeData);

    this.logger.log(
      `Generated challenge for walletAddress ${walletAddress}: ${challenge}`
    );
    return challenge;
  }

  async verifyTonProof(account: Account, tonProof: TonProof): Promise<boolean> {
    const payload = {
      address: account.address,
      public_key: account.publicKey,
      proof: {
        ...tonProof.proof,
        state_init: account.walletStateInit,
      },
    };

    this.logger.log(
      `Verifying TON Proof. Payload: ${JSON.stringify(payload, null, 2)}`
    );

    try {
      if (!payload.proof.state_init) {
        this.logger.error('State init is missing in TON Proof payload');
        return false;
      }

      const stateInit = loadStateInit(
        Cell.fromBase64(payload.proof.state_init).beginParse()
      );
      this.logger.log('stateInit is OK');

      const masterAt = await this.client.getLastBlock();
      this.logger.log('masterAt is OK:', masterAt);

      const result = await this.client.runMethod(
        masterAt.last.seqno,
        Address.parse(payload.address),
        'get_public_key',
        []
      );
      this.logger.log(
        'result is OK:',
        result,
        'by walletAddress: ',
        payload.address
      );

      if (result.exitCode !== 0) {
        this.logger.log('get_public_key failed, using alternative method');

        const publicKeyFromStateInit = Buffer.from(payload.public_key, 'hex');
        if (!publicKeyFromStateInit) {
          return false;
        }

        const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
        if (!publicKeyFromStateInit.equals(wantedPublicKey)) {
          return false;
        }

        const wantedAddress = Address.parse(payload.address);
        const address = contractAddress(wantedAddress.workChain, stateInit);
        if (!address.equals(wantedAddress)) {
          return false;
        }

        const now = Math.floor(Date.now() / 1000);
        if (now - 60 * 15 > payload.proof.timestamp) {
          return false;
        }

        return true;
      }

      const publicKey = Buffer.from(
        result.reader.readBigNumber().toString(16).padStart(64, '0'),
        'hex'
      );
      this.logger.log(`publicKey: ${publicKey}`);

      if (!publicKey) {
        return false;
      }

      const wantedPublicKey = Buffer.from(payload.public_key, 'hex');
      if (!publicKey.equals(wantedPublicKey)) {
        return false;
      }

      const wantedAddress = Address.parse(payload.address);
      const address = contractAddress(wantedAddress.workChain, stateInit);
      if (!address.equals(wantedAddress)) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      if (now - 60 * 15 > payload.proof.timestamp) {
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Error verifying TON Proof: ${(error as AxiosError).message}`
      );
      return false;
    }
  }
}
