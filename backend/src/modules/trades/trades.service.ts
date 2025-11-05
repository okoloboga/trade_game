import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trade } from '../../entities/trade.entity';
import { User } from '../../entities/user.entity';
import { TradeDto } from './dto/trade.dto';
import { MarketService } from '../market/market.service';
import { TokensService } from '../tokens/tokens.service';
import { TonService } from '../ton/ton.service';

@Injectable()
export class TradesService {
  private readonly logger = new Logger(TradesService.name);
  private readonly maxUsdtBalance = 10;

  constructor(
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly marketService: MarketService,
    private readonly tokensService: TokensService,
    private readonly tonService: TonService
  ) {}

  /**
   * Executes a buy trade, converting TON to USDT and accruing tokens.
   * @param tradeDto - DTO containing TON address, amount, and symbol.
   * @returns {Promise<{ trade: Trade, user: User, tokensAccrued: number }>} Trade details, updated user data, and accrued tokens.
   * @throws {UnauthorizedException} If user is not found.
   * @throws {BadRequestException} If balance is insufficient or USDT limit is exceeded.
   */
  async buyTrade(tradeDto: TradeDto) {
    const { ton_address, amount, symbol } = tradeDto;
    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new UnauthorizedException('User not found');
    }

    const amountNum = Number(amount);
    const usdtPrice = Number(await this.getCurrentPrice(symbol));
    const tonAmount = amountNum / usdtPrice;

    // Get trading balance from DB (virtual balance for trading)
    let tradingBalance = Number(user.balance || 0);
    
    // If trading balance is 0 or out of sync, sync with on-chain balance
    if (tradingBalance === 0) {
      const onChainBalanceNano = await this.tonService.getBalance(user.ton_address);
      tradingBalance = Number(onChainBalanceNano) / 1e9;
      user.balance = tradingBalance;
      this.logger.log(
        `Synced trading balance for user ${user.ton_address}: ${tradingBalance} TON`
      );
    }

    if (tradingBalance < tonAmount) {
      throw new BadRequestException('Insufficient TON balance');
    }

    // Update trading balance in database (virtual balance for trading)
    user.balance = tradingBalance - tonAmount;
    user.usdt_balance = Number(user.usdt_balance || 0) + amountNum;
    if (user.usdt_balance > this.maxUsdtBalance) {
      throw new BadRequestException(
        `USDT balance cannot exceed ${this.maxUsdtBalance} USD`
      );
    }

    const trade = this.tradeRepository.create({
      user,
      instrument: symbol,
      type: 'buy',
      amount: amountNum,
      usdt_price: usdtPrice,
      profit_loss: 0,
    });

    await this.userRepository.save(user);
    await this.tradeRepository.save(trade);
    const tokensAccrued = await this.tokensService.accrueTokens(trade);
    return { trade, user, tokensAccrued };
  }

  /**
   * Executes a sell trade, converting USDT to TON and accruing tokens.
   * @param tradeDto - DTO containing TON address, amount, and symbol.
   * @returns {Promise<{ trade: Trade, user: User, tokensAccrued: number }>} Trade details, updated user data, and accrued tokens.
   * @throws {UnauthorizedException} If user is not found.
   * @throws {BadRequestException} If balance is insufficient or USDT limit is exceeded.
   */
  async sellTrade(tradeDto: TradeDto) {
    const { ton_address, amount, symbol } = tradeDto;
    const user = await this.userRepository.findOne({ where: { ton_address } });
    if (!user) {
      this.logger.error(`User not found for ton_address: ${ton_address}`);
      throw new UnauthorizedException('User not found');
    }

    const amountNum = Number(amount);
    if (Number(user.usdt_balance || 0) < amountNum) {
      throw new BadRequestException('Insufficient USDT balance');
    }

    const usdtPrice = Number(await this.getCurrentPrice(symbol));
    const tonAmount = amountNum / usdtPrice;

    // Update trading balances (virtual balances for trading)
    user.usdt_balance = Number(user.usdt_balance || 0) - amountNum;
    const tradingBalance = Number(user.balance || 0);
    user.balance = tradingBalance + tonAmount;
    if (user.usdt_balance > this.maxUsdtBalance) {
      throw new BadRequestException(
        `USDT balance cannot exceed ${this.maxUsdtBalance} USD`
      );
    }

    const prevBuy = await this.tradeRepository.findOne({
      where: {
        user: { ton_address },
        instrument: symbol,
        type: 'buy',
      },
      order: { created_at: 'DESC' },
    });
    let profitLoss = 0;
    if (prevBuy) {
      profitLoss = (usdtPrice - Number(prevBuy.usdt_price)) * tonAmount;
    }

    const trade = this.tradeRepository.create({
      user,
      instrument: symbol,
      type: 'sell',
      amount: amountNum,
      usdt_price: usdtPrice,
      profit_loss: profitLoss,
    });
    await this.userRepository.save(user);
    await this.tradeRepository.save(trade);
    const tokensAccrued = await this.tokensService.accrueTokens(trade);
    return { trade, user, tokensAccrued };
  }

  /**
   * Fetches the current market price for a given instrument.
   * @param instrument - The trading pair symbol (e.g., TON-USDT).
   * @returns {Promise<number>} Current price in USD.
   * @throws {BadRequestException} If price fetch fails or price is invalid.
   */
  private async getCurrentPrice(instrument: string): Promise<number> {
    try {
      const price = await this.marketService.getCurrentPrice(instrument);
      if (!price || price <= 0) {
        throw new BadRequestException('Invalid market price');
      }
      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${instrument}: ${(error as Error).message}`
      );
      throw new BadRequestException(`Failed to fetch price for ${instrument}`);
    }
  }
}
