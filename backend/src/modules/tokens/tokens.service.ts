import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Trade } from '../../entities/trade.entity';
import { WithdrawTokensDto } from './dto/withdraw-tokens.dto';
import { MarketService } from '../market/market.service';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import {
  Address,
  toNano,
  WalletContractV4,
  beginCell,
  storeMessage,
  internal,
  external,
  TupleReader,
} from 'ton';
import { TonClient4 } from 'ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { AxiosError } from 'axios';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private client: TonClient4;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Trade)
    private readonly marketService: MarketService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService
  ) {
    const tonEndpoint =
      this.configService.get<string>('TON_ENDPOINT') ||
      'https://mainnet-v4.tonhubapi.com';
    this.client = new TonClient4({ endpoint: tonEndpoint });
  }

  async accrueTokens(trade: Trade): Promise<number> {
    const user = trade.user;
    const tonPriceUsd = await this.getTonPrice();
    const tradeVolumeUsd = trade.amount * tonPriceUsd;

    const cacheKey = `daily_volume:${user.id}:${new Date().toISOString().split('T')[0]}`;
    const dailyVolume =
      parseFloat((await this.redis.get(cacheKey)) || '0') + tradeVolumeUsd;
    await this.redis.set(cacheKey, dailyVolume.toString(), 'EX', 24 * 60 * 60);

    const tokensToAccrue = Math.floor(dailyVolume / 10);
    const dailyTokensKey = `daily_tokens:${user.id}`;
    const dailyTokens = parseInt((await this.redis.get(dailyTokensKey)) || '0');

    if (dailyTokens >= 10) {
      return 0;
    }

    const newTokens = Math.min(tokensToAccrue, 10 - dailyTokens);
    if (newTokens > 0) {
      user.token_balance += newTokens;
      await this.userRepository.save(user);
      await this.redis.set(
        dailyTokensKey,
        (dailyTokens + newTokens).toString(),
        'EX',
        24 * 60 * 60
      );
      this.logger.log(
        `Accrued ${newTokens} RUBLE for user ${user.id}, volume: $${dailyVolume}`
      );
    }

    return newTokens;
  }

  async withdrawTokens(withdrawTokensDto: WithdrawTokensDto) {
    const { userId, amount } = withdrawTokensDto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.token_balance < amount) {
      throw new BadRequestException('Insufficient token balance');
    }

    // Initialize TON wallet
    const mnemonic = this.configService.get<string>('CENTRAL_WALLET_MNEMONIC');
    const jettonMasterAddress = this.configService.get<string>(
      'JETTON_MASTER_ADDRESS'
    );
    if (!mnemonic || !jettonMasterAddress) {
      throw new BadRequestException('TON configuration missing');
    }

    try {
      // Create wallet from mnemonic
      const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
      const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
      });
      const walletContract = this.client.open(wallet);

      // Get Jetton wallet address
      const jettonMaster = Address.parse(jettonMasterAddress);
      const jettonWalletAddress = await this.getJettonWalletAddress(
        jettonMaster,
        wallet.address
      );

      // Construct message body for Jetton transfer
      const messageBody = beginCell()
        .storeUint(0xf8a7ea5, 32) // Opcode for Jetton transfer
        .storeUint(0, 64) // Query ID
        .storeCoins(toNano(amount)) // Amount in nanoJETTON
        .storeAddress(Address.parse(user.ton_address)) // Recipient address
        .storeAddress(wallet.address) // Response destination
        .storeBit(0) // No custom payload
        .storeCoins(toNano('0.01')) // Forward TON amount for gas
        .storeBit(0) // No forward payload
        .endCell();

      // Create internal message
      const internalMessage = internal({
        to: jettonWalletAddress,
        value: toNano('0.1'), // Gas
        bounce: true,
        body: messageBody,
      });

      // Create transfer transaction
      const seqno = await walletContract.getSeqno();
      const body = wallet.createTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [internalMessage],
      });

      // Create external message
      const externalMessage = external({
        to: wallet.address,
        body,
      });

      // Serialize and send transaction
      const externalMessageCell = beginCell()
        .store(storeMessage(externalMessage))
        .endCell();
      const signedTransaction = externalMessageCell.toBoc();
      await this.client.sendMessage(signedTransaction);

      // Update user balance
      user.token_balance -= amount;
      await this.userRepository.save(user);

      this.logger.log(
        `Initiated withdrawal of ${amount} RUBLE to ${user.ton_address}`
      );
      return { user, txHash: externalMessageCell.hash().toString('hex') };
    } catch (error) {
      this.logger.error(
        `Error withdrawing ${amount} RUBLE to ${user.ton_address}: ${(error as AxiosError).message}`
      );
      throw new BadRequestException('Failed to process withdrawal');
    }
  }

  private async getJettonWalletAddress(
    jettonMaster: Address,
    owner: Address
  ): Promise<Address> {
    const lastBlock = await this.client.getLastBlock();
    const userAddressCell = beginCell().storeAddress(owner).endCell();
    const response = await this.client.runMethod(
      lastBlock.last.seqno,
      jettonMaster,
      'get_wallet_address',
      [{ type: 'slice', cell: userAddressCell }]
    );
    const reader = new TupleReader(response.result);
    return reader.readAddress();
  }

  private async getTonPrice(): Promise<number> {
    const cacheKey = 'ton_price_usd';
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return parseFloat(cached);
    }

    try {
      const response = await this.marketService.getCurrentPrice('TON-USDT');
      const price = response;
      await this.redis.set(cacheKey, price, 'EX', 300);
      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch TON price: ${(error as AxiosError).message}`
      );
      return 5.0;
    }
  }
}
