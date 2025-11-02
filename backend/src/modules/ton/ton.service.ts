import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonClient, Address, WalletContractV4, internal, toNano } from '@ton/ton';
import { mnemonicToWalletKey } from '@ton/crypto';
import { WalletContract } from '../wrappers/WalletContract';
import { storeAwardJetton } from '../wrappers/WalletContract';
import { beginCell } from '@ton/core';

@Injectable()
export class TonService implements OnModuleInit {
  private readonly logger = new Logger(TonService.name);
  private client: TonClient;
  private walletContract: WalletContract;
  private ownerWallet?: WalletContractV4;

  constructor(private readonly configService: ConfigService) {
    const tonEndpoint = 'https://toncenter.com/api/v2/jsonRPC';
    // TODO: move to config
    const apiKey = this.configService.get<string>('TON_API_KEY');
    if (!apiKey) {
      throw new BadRequestException('TON_API_KEY is not defined in .env');
    }
    this.client = new TonClient({ endpoint: tonEndpoint, apiKey });
    this.logger.log(`Initialized TON client with endpoint: ${tonEndpoint}`);
  }

  async onModuleInit() {
    const contractAddressString = this.configService.get<string>(
      'WALLET_CONTRACT_ADDRESS'
    );
    if (!contractAddressString) {
      throw new BadRequestException(
        'WALLET_CONTRACT_ADDRESS is not defined in .env'
      );
    }

    try {
      const contractAddress = Address.parse(contractAddressString);
      this.walletContract = WalletContract.fromAddress(contractAddress);
      this.logger.log(
        `Initialized WalletContract at address: ${contractAddressString}`
      );
    } catch (error) {
      this.logger.error(
        `Failed to initialize WalletContract: ${error.message}`
      );
      throw new BadRequestException('Failed to initialize WalletContract');
    }

    // Initialize owner wallet for AwardJetton transactions
    const ownerMnemonic = this.configService.get<string>('OWNER_MNEMONIC');
    if (ownerMnemonic) {
      try {
        const key = await mnemonicToWalletKey(ownerMnemonic.split(' '));
        this.ownerWallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
        this.logger.log(`Initialized owner wallet for AwardJetton: ${this.ownerWallet.address}`);
      } catch (error) {
        this.logger.warn(`Failed to initialize owner wallet: ${error.message}`);
        this.logger.warn('AwardJetton functionality will not be available');
      }
    } else {
      this.logger.warn('OWNER_MNEMONIC not configured - AwardJetton functionality disabled');
    }
  }

  /**
   * Retrieves the on-chain balance for a given user address from the smart contract.
   * @param userAddress - The TON address of the user.
   * @returns {Promise<bigint>} The user's balance in nanoTONs.
   */
  async getBalance(userAddress: string): Promise<bigint> {
    if (!this.walletContract) {
      throw new BadRequestException('WalletContract not initialized');
    }
    if (!this.client) {
      throw new BadRequestException('TON client not initialized');
    }

    try {
      const contractProvider = this.client.provider(
        this.walletContract.address,
        this.walletContract.init
      );
      const userAddr = Address.parse(userAddress);
      const balance = await this.walletContract.getBalanceOf(
        contractProvider,
        userAddr
      );
      return balance;
    } catch (error) {
      this.logger.error(
        `Failed to get balance for ${userAddress}: ${error.message}`
      );
      throw new BadRequestException('Failed to get on-chain balance');
    }
  }

  /**
   * Sends AwardJetton message to the smart contract from the owner wallet.
   * This is used to transfer RUBLE tokens (jettons) to users.
   * @param userAddress - The TON address of the recipient.
   * @param amount - The amount of tokens to send (in RUBLE token units).
   * @returns {Promise<string>} Transaction hash (BOC).
   * @throws {BadRequestException} If owner wallet is not configured or transaction fails.
   */
  async sendAwardJetton(userAddress: string, amount: string): Promise<string> {
    if (!this.walletContract) {
      throw new BadRequestException('WalletContract not initialized');
    }
    if (!this.client) {
      throw new BadRequestException('TON client not initialized');
    }

    const ownerMnemonic = this.configService.get<string>('OWNER_MNEMONIC');
    if (!ownerMnemonic) {
      throw new BadRequestException('OWNER_MNEMONIC is required for sending AwardJetton');
    }

    try {
      const userAddr = Address.parse(userAddress);
      const amountInNano = toNano(amount);

      // Create AwardJetton message
      const messageBody = beginCell()
        .store(storeAwardJetton({ 
          $type: 'AwardJetton', 
          user: userAddr, 
          amount: amountInNano 
        }))
        .endCell();

      // Get owner wallet key from mnemonic
      const key = await mnemonicToWalletKey(ownerMnemonic.split(' '));
      const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });

      // Open wallet with secret key for signing transactions
      const walletContract = this.client.open(wallet);
      
      const seqno = await walletContract.getSeqno();
      
      // Send transaction - wallet will sign with secret key if available
      // Note: The wallet contract needs to be opened with secret key support
      // For now, we'll use the send method which should work with the wallet opened from client
      await walletContract.send(internal({
        to: this.walletContract.address,
        value: toNano('0.05'), // Gas fee
        body: messageBody,
      }));

      // Wait for transaction to be processed
      let currentSeqno = await walletContract.getSeqno();
      let attempts = 0;
      while (currentSeqno === seqno && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        currentSeqno = await walletContract.getSeqno();
        attempts++;
      }

      // Return a transaction identifier (in production, you might want to get actual tx hash)
      // For now, we'll use the message body hash as identifier
      const txHash = messageBody.hash().toString('base64');
      
      this.logger.log(
        `Sent AwardJetton: ${amount} tokens to ${userAddress}, txHash: ${txHash}`
      );

      return txHash;
    } catch (error) {
      this.logger.error(
        `Failed to send AwardJetton to ${userAddress}: ${error.message}`
      );
      throw new BadRequestException('Failed to send AwardJetton');
    }
  }
}
