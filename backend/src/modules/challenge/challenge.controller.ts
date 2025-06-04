import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ChallengeService } from './challenge.service';
import { AxiosError } from 'axios';
import { TonProof, Account } from 'src/types/ton.types';

interface VerifyTonProofDto {
  walletAddress: string;
  tonProof: TonProof;
  account: Account;
}

interface ChallengeResponse {
  challenge: string;
  validUntil: number;
}

@Controller('challenge')
export class ChallengeController {
  private readonly logger = new Logger(ChallengeController.name);

  constructor(private readonly challengeService: ChallengeService) {}

  @Get('generate')
  async generateChallenge(@Query('walletAddress') walletAddress: string): Promise<ChallengeResponse> {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    const { challenge, validUntil } = await this.challengeService.generateChallenge(walletAddress);
    return { challenge, validUntil };
  }

  @Post('verify')
  async verifyTonProof(
    @Body() verifyDto: VerifyTonProofDto
  ): Promise<{ valid: boolean }> {
    const { walletAddress, tonProof, account } = verifyDto;

    if (!walletAddress || !tonProof) {
      this.logger.warn('Missing required parameters in verify request');
      throw new BadRequestException('Missing required parameters');
    }

    try {
      this.logger.log(
        `Starting TON Proof verification for walletAddress: ${walletAddress}`
      );
      const isValid = await this.challengeService.verifyTonProof(
        account,
        tonProof
      );

      if (isValid) {
        this.logger.log(
          `TON Proof verification successful for walletAddress: ${walletAddress}`
        );
      } else {
        this.logger.warn(
          `TON Proof verification failed for walletAddress: ${walletAddress}`
        );
      }

      return { valid: isValid };
    } catch (error) {
      this.logger.error(
        `Error verifying TON Proof for walletAddress: ${walletAddress}`,
        (error as AxiosError).message
      );
      throw new BadRequestException('Error verifying TON Proof.');
    }
  }
}
