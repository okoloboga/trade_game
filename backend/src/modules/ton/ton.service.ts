import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TonClient, Address } from '@ton/ton';
import { WalletContract } from '../wrappers/WalletContract';

@Injectable()
export class TonService implements OnModuleInit {
  private readonly logger = new Logger(TonService.name);
  private client: TonClient;
  private walletContract: WalletContract;

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
}
