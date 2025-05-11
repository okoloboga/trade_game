import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Trade } from '../../entities/trade.entity';
import { WithdrawTokensDto } from './dto/withdraw-tokens.dto';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { MarketService } from '../market/market.service';
import { ConfigService } from '@nestjs/config';
import { TonClient, WalletContractV4, Address, toNano, internal, beginCell } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  private readonly volumeThresholdUsd = 10; // $10 объёма = 1 RUBLE
  private readonly dailyLimitRubles = 10; // Макс 10 RUBLE в день
  private readonly centralWalletMnemonic: string;
  private readonly jettonMasterAddress: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly marketService: MarketService,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.centralWalletMnemonic = this.configService.get<string>('CENTRAL_WALLET_MNEMONIC') || '';
    this.jettonMasterAddress = this.configService.get<string>('JETTON_MASTER_ADDRESS') || '';
  }

  async accrueTokens(trade: Trade) {
    const user = trade.user;
    const cacheKey = `daily_volume:${user.id}:${new Date().toISOString().split('T')[0]}`;

    // Получение текущей цены TON/USDT
    const tonPriceUsd = await this.getTonPrice();
    const tradeVolumeUsd = trade.amount * tonPriceUsd;

    // Учёт дневного объёма
    const currentVolume = parseFloat((await this.redis.get(cacheKey)) || '0');
    const newVolume = currentVolume + tradeVolumeUsd;
    await this.redis.set(cacheKey, newVolume, 'EX', 24 * 60 * 60); // 24 часа

    // Расчёт токенов
    const totalTokensEarned = Math.floor(newVolume / this.volumeThresholdUsd);
    const currentTokens = parseFloat((await this.redis.get(`daily_tokens:${user.id}`)) || '0');
    const newTokens = Math.min(totalTokensEarned - currentTokens, this.dailyLimitRubles - currentTokens);

    if (newTokens > 0) {
      user.token_balance += newTokens;
      await this.userRepository.save(user);
      await this.redis.set(`daily_tokens:${user.id}`, currentTokens + newTokens, 'EX', 24 * 60 * 60);
      this.logger.log(`Accrued ${newTokens} RUBLE for user ${user.id}, volume: $${newVolume}`);
    }

    return newTokens;
  }

  async withdrawTokens(withdrawTokensDto: WithdrawTokensDto) {
    const { userId, amount } = withdrawTokensDto;

    // Получение пользователя
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Проверка баланса
    if (user.token_balance < amount) {
      throw new BadRequestException('Insufficient token balance');
    }
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Инициализация TON клиента
    const client = new TonClient({
      endpoint: this.configService.get<string>('TON_ENDPOINT') || 'https://testnet.toncenter.com/api/v2/jsonRPC',
    });

    // Получение ключей центрального кошелька
    const keyPair = await mnemonicToPrivateKey(this.centralWalletMnemonic.split(' '));
    const wallet = WalletContractV4.create({ workchain: 0, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    // Подготовка JETTON-трансфера
    const jettonTransferBody = beginCell()
      .storeUint(0xf8a7ea5, 32) // opcode для JETTON-трансфера
      .storeUint(0, 64) // query_id
      .storeCoins(toNano(amount)) // количество токенов
      .storeAddress(Address.parse(user.ton_address)) // адрес получателя
      .storeAddress(Address.parse(wallet.address.toString())) // адрес отправителя (для уведомлений)
      .storeCoins(toNano('0.05')) // TON для газа
      .storeUint(0, 1) // custom_payload (пустой)
      .endCell();

    const seqno = await contract.getSeqno();
    const transfer = contract.createTransfer({
      seqno,
      messages: [
        internal({
          to: this.jettonMasterAddress,
          value: toNano('0.1'), // TON для газа
          body: jettonTransferBody,
        }),
      ],
      secretKey: keyPair.secretKey,
    });

    // Отправка транзакции
    await contract.send(transfer);
    this.logger.log(`Initiated withdrawal of ${amount} RUBLE to ${user.ton_address}`);

    // Обновление баланса
    user.token_balance -= amount;
    await this.userRepository.save(user);

    return { user, txHash: 'pending' }; // txHash пока заглушка
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
      this.logger.error(`Failed to fetch TON price: ${(error as any).message}`);
      return 5.0; // Fallback
    }
  }
}
