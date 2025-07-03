# Ruble Trade Game
[Ruble Trade Game](https://t.me/ruble_caller_bot) is a Telegram Web App for trading TON/USDT pairs, managing wallet balances, and earning RUBLE tokens based on trading volume. Built with a Vue.js frontend and a NestJS backend, it integrates with the TON blockchain via TonConnect for wallet authentication and transactions. The app supports real-time market data, trade history, and user statistics, with a focus on a seamless user experience in a Telegram environment.

**Features**

- **Trading:** Execute buy/sell trades for TON/USDT with real-time market prices.
- **Wallet Management:** Deposit and withdraw TON, and withdraw RUBLE tokens to a TON wallet.
- **RUBLE Tokens:** Earn up to 10 RUBLE tokens daily based on trading volume (1 RUBLE per $10 traded).
- **Trade History:** View trade history with details like type, amount, price, profit/loss, and date.
- **Real-time Market Data:** Display current TON/USDT price via WebSocket (market.gateway.ts).
- **Localization:** Support for English and Russian languages.
- **Authentication:** Secure wallet-based authentication using TonConnect.
- **Responsive UI:** Built with Vuetify for a modern, mobile-friendly interface.

## Tech Stack
### Frontend

- **Vue.js 3:** Component-based UI with Composition API.
- **Vite:** Build tool for fast development and optimized production builds.
- **Vuetify:** Material Design component library.
- **Pinia:** State management for stores (auth, wallet, trading, market).
- **TonConnect (@townsquarelabs/ui-vue):** TON wallet integration.
- **vue-i18n:** Localization for EN/RU.
- **Axios:** HTTP client for API requests.
- **@twa-dev/sdk:** Telegram Web App integration.
- **lightweight-charts:** Charting for market data visualization.

### Backend

- **NestJS:** Node.js framework for scalable server-side applications.
- **TypeORM:** ORM for PostgreSQL database management.
- **Redis:** Caching for market prices and daily trading volumes.
- **JWT:** Authentication for secure API endpoints.
- **Axios:** For fetching market data.
- **WebSocket:** Real-time market updates via market.gateway.ts.
- **TON SDK:** Blockchain interactions for token transfers.

### Database

- **PostgreSQL:** Stores users, trades, and transactions.
- **Entities:**
User: Stores ton_address, token_balance, balance (TON), usdt_balance.
Trade: Stores trade details (type, amount, usdt_price, profit_loss, created_at).
Transaction: Stores token transactions (type, amount, ton_tx_hash, status).

### Prerequisites

- **Node.js:** v18.x or higher
- **PostgreSQL:** v13 or higher
- **Redis:** v6 or higher
- **Docker:** For containerized deployment
- **Telegram Web App:** Access via Telegram bot
- **TON Wallet:** For testing wallet interactions

## Manual Testing:

Connect a TON wallet via TonConnect in the app.
Execute a buy/sell trade in TradeButtons.vue:
Verify that usdt_price is saved in the trades table.
Check trade history in TradeHistory.vue for Price column.


Withdraw RUBLE tokens via WithdrawTokensDialog.vue:
Verify transaction in the transactions table with type: 'ruble'.


## Contributing

Fork the repository.
Create a feature branch (git checkout -b feature/your-feature).
Commit changes (git commit -m "Add your feature").
Push to the branch (git push origin feature/your-feature).
Open a Pull Request.

### Known Issues

Dynamic Imports: auth.js and wallet.js have mixed static/dynamic imports, causing Vite warnings. Consider using fully dynamic imports for better chunk splitting.
Source Maps: vite-plugin-vue-svg generates incorrect source maps, which may affect debugging. Check for updates or switch to vite-svg-loader.

License
MIT License. See LICENSE for details.

## Authors
[okoloboga](https://t.me/okolo_boga)
