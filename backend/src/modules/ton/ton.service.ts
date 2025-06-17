import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  TonClient,
  WalletContractV4,
  beginCell,
  Address,
  toNano,
  internal,
  external,
  storeMessage,
} from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import * as nacl from 'tweetnacl';
import { AxiosError } from 'axios';

@Injectable()
export class TonService {
  private readonly logger = new Logger(TonService.name);
  private client: TonClient | null = null;
  private centralWallet: WalletContractV4 | null = null;
  private jettonMasterAddress: Address | null = null;
  private keyPair: nacl.SignKeyPair | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
    this.initializeWallet();
  }

  private initializeClient() {
    const tonEndpoint = this.configService.get<string>('TON_ENDPOINT') || 'https://toncenter.com/api/v2/jsonRPC';
    const apiKey = this.configService.get<string>('TON_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('TON_API_KEY is not defined in .env');
    }
    this.client = new TonClient({ endpoint: tonEndpoint, apiKey });
    this.logger.log(`Initialized TON client with endpoint: ${tonEndpoint}`);
  }

  private async initializeWallet() {
    const mnemonic = this.configService.get<string>('CENTRAL_WALLET_MNEMONIC');
    const jettonMasterAddress = this.configService.get<string>('JETTON_MASTER_ADDRESS');
    if (!mnemonic || !jettonMasterAddress) {
      throw new BadRequestException('TON configuration missing: mnemonic or jetton address');
    }

    try {
      const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
      this.keyPair = nacl.sign.keyPair.fromSecretKey(Buffer.from(keyPair.secretKey));
      this.centralWallet = WalletContractV4.create({
        workchain: 0,
        publicKey: Buffer.from(this.keyPair.publicKey),
      });
      this.jettonMasterAddress = Address.parse(jettonMasterAddress);
      this.logger.log(`Initialized central wallet: ${this.centralWallet.address.toString()}`);
    } catch (error) {
      this.logger.error(`Failed to initialize wallet: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to initialize TON wallet');
    }
  }
  async getUserJettonWalletAddress(userAddress: Address): Promise<Address> {
    if (!this.jettonMasterAddress) {
      throw new BadRequestException('Jetton master address not initialized');
    }
    if (!this.client) {
      throw new BadRequestException('TON client not initialized');
    }
    const userAddressCell = beginCell().storeAddress(userAddress).endCell();
    try {
      const response = await this.client.runMethod(this.jettonMasterAddress, 'get_wallet_address', [
        { type: 'slice', cell: userAddressCell },
      ]);
      return response.stack.readAddress();
    } catch (error) {
      this.logger.error(`Failed to get Jetton wallet address: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to get Jetton wallet address');
    }
  }

  async sendTokens(recipientAddress: string, amount: string): Promise<string> {
    if (!this.centralWallet || !this.keyPair || !this.jettonMasterAddress || !this.client) {
      throw new BadRequestException('Central wallet or client not initialized');
    }

    try {
      const wallet = this.client.open(this.centralWallet);
      const seqno = await wallet.getSeqno();
      const jettonWalletAddress = await this.getUserJettonWalletAddress(this.centralWallet.address);

      const messageBody = beginCell()
        .storeUint(0x0f8a7ea5, 32) // Opcode for Jetton transfer
        .storeUint(0, 64) // Query ID
        .storeCoins(toNano(amount)) // Amount in nanoJETTON
        .storeAddress(Address.parse(recipientAddress)) // Recipient
        .storeAddress(this.centralWallet.address) // Response destination
        .storeBit(0) // No custom payload
        .storeCoins(toNano('0.01')) // Forward TON for gas
        .storeBit(0) // No forward payload
        .endCell();

      const internalMessage = internal({
        to: jettonWalletAddress,
        value: toNano('0.1'),
        bounce: true,
        body: messageBody,
      });

      const body = this.centralWallet.createTransfer({
        seqno,
        secretKey: Buffer.from(this.keyPair.secretKey),
        messages: [internalMessage],
      });

      const externalMessage = external({
        to: this.centralWallet.address,
        body,
      });

      const externalMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();
      const signedTransaction = externalMessageCell.toBoc();
      await this.client.sendFile(signedTransaction);

      const txHash = externalMessageCell.hash().toString('hex');
      this.logger.log(`Sent ${amount} RUBLE to ${recipientAddress}, txHash: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to send tokens: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to send RUBLE tokens');
    }
  }

  async sendTon(recipientAddress: string, amount: string): Promise<string> {
    if (!this.centralWallet || !this.keyPair || !this.client) {
      throw new BadRequestException('Central wallet or client not initialized');
    }

    try {
      const wallet = this.client.open(this.centralWallet);
      const seqno = await wallet.getSeqno();

      const internalMessage = internal({
        to: Address.parse(recipientAddress),
        value: toNano(amount),
        bounce: true,
        body: beginCell().endCell(),
      });

      const body = this.centralWallet.createTransfer({
        seqno,
        secretKey: Buffer.from(this.keyPair.secretKey),
        messages: [internalMessage],
      });

      const externalMessage = external({
        to: this.centralWallet.address,
        body,
      });

      const externalMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();
      const signedTransaction = externalMessageCell.toBoc();
      await this.client.sendFile(signedTransaction);

      const txHash = externalMessageCell.hash().toString('hex');
      this.logger.log(`Sent ${amount} TON to ${recipientAddress}, txHash: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to send TON: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to send TON');
    }
  }

  async getWalletData(userAddress: string): Promise<{ balance: string; tokenBalance: string; address: string; depositAddress: string }> {
    if (!this.client) {
      throw new BadRequestException('TON client not initialized');
    }
    try {
      const address = Address.parse(userAddress);
      const account = await this.client.getContractState(address);
      const balance = account.balance;
      // Note: Fetching Jetton balance requires contract call
      const tokenBalance = '0'; // Placeholder: Implement Jetton balance check
      return {
        balance: (Number(balance) / 1e9).toFixed(2), // Convert nanoTON to TON
        tokenBalance,
        address: userAddress,
        depositAddress: userAddress, // Same as address for deposits
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet data: ${(error as AxiosError).message}`);
      throw new BadRequestException('Failed to fetch wallet data');
    }
  }
}
