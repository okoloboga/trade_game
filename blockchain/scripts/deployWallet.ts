import { toNano, Address } from '@ton/core';
import { WalletContract } from '../build/Wallet/Wallet_WalletContract';
import { NetworkProvider } from '@ton/blueprint';
import * as QRCode from 'qrcode-terminal';

export async function run(provider: NetworkProvider) {
  // ⚙️ Задай параметры
  const owner = Address.parse('UQCpIGMtcP6OQH17MacwuwMKyuOF5F8LwBhU2NElKZtyGI4Y'); // Адрес владельца (из OWNER_MNEMONIC)
  const jettonMaster = Address.parse('EQA5QopV0455mb09Nz6iPL3JsX_guIGf77a6l-DtqSQh0aE-'); // Адрес RUBLE токенов (Jetton Master)
  const withdrawFeeBps = 100n; // 1% комиссия за вывод (100 базисных пунктов = 1%)

  // 📦 Создаём инстанс контракта
  const wallet = provider.open(
    await WalletContract.fromInit(
      owner,
      jettonMaster,
      withdrawFeeBps
    )
  );

  console.log('📋 Contract will be deployed at:', wallet.address.toString());
  console.log('💰 Deploy cost: ~0.05 TON');
  console.log('');

  // 📱 Показываем QR код для оплаты
  const deployLink = `ton://transfer/${wallet.address.toString()}?amount=${toNano('0.05').toString()}`;
  console.log('📱 Scan QR code to deploy contract:');
  console.log('');
  QRCode.generate(deployLink, { small: true });
  console.log('');
  console.log('🔗 Or use link:', deployLink);
  console.log('');
  console.log('⏳ Waiting for payment...');

  // 🚀 Отправляем транзакцию деплоя (используем Pause как в тестах)
  await wallet.send(
    provider.sender(),
    { value: toNano('0.05') }, // на газ
    { $$type: 'Pause', flag: false } // активируем контракт через owner сообщение
  );

  // ⏳ Ждём подтверждения
  await provider.waitForDeploy(wallet.address);

  console.log('✅ WalletContract deployed at:', wallet.address.toString());
  console.log('📋 Contract parameters:');
  console.log('   Owner:', owner.toString());
  console.log('   Jetton Master:', jettonMaster.toString());
  console.log('   Withdraw Fee:', withdrawFeeBps.toString(), 'bps (1%)');
  console.log('');
  console.log('💡 Note: Contract deployed successfully');
  console.log('   Contract accepts deposits via Deposit message');
  console.log('   Users can withdraw TON with fee');
  console.log('   Owner can send AwardJetton to distribute RUBLE tokens');
  console.log('');
  console.log('🔑 Save this address to WALLET_CONTRACT_ADDRESS in backend .env');
  console.log('📱 Save this address to VITE_WALLET_CONTRACT_ADDRESS in frontend .env');
}
