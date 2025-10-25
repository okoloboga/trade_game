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
  clientId: string;
}

interface ChallengeResponse {
  challenge: string;
  validUntil: number;
  clientId: string;
}

@Controller('challenge')
export class ChallengeController {
  private readonly logger = new Logger(ChallengeController.name);

  constructor(private readonly challengeService: ChallengeService) {}

  @Get('generate')
  async generateChallenge(
    @Query('clientId') clientId?: string
  ): Promise<ChallengeResponse> {
    return await this.challengeService.generateChallenge(clientId);
  }

  @Post('verify')
  async verifyTonProof(
    @Body() verifyDto: VerifyTonProofDto
  ): Promise<{ valid: boolean }> {
    const { walletAddress, tonProof, account, clientId } = verifyDto;

    if (!walletAddress || !tonProof || !clientId) {
      this.logger.warn('Missing required parameters in verify request');
      throw new BadRequestException('Missing required parameters');
    }

    try {
      const isValid = await this.challengeService.verifyTonProof(
        account,
        tonProof,
        clientId
      );

      if (isValid) {
        this.logger.log(
          `TON Proof verification successful for walletAddress: ${walletAddress}, clientId: ${clientId}`
        );
      } else {
        this.logger.warn(
          `TON Proof verification failed for walletAddress: ${walletAddress}, clientId: ${clientId}`
        );
      }

      return { valid: isValid };
    } catch (error) {
      this.logger.error(
        `Error verifying TON Proof for walletAddress: ${walletAddress}, clientId: ${clientId}`,
        (error as AxiosError).message
      );
      throw new BadRequestException('Error verifying TON Proof.');
    }
  }
}
