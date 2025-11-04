// Полифил для @ton/crypto в браузере
// Этот модуль используется только в Node.js (backend), в браузере не нужен
// Экспортируем пустые функции, чтобы избежать ошибок импорта

export const mnemonicToWalletKey = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const mnemonicToSeed = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const keyPairFromSeed = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

// Экспортируем все остальные функции как пустые, если они используются
export default {
  mnemonicToWalletKey,
  mnemonicToSeed,
  keyPairFromSeed,
};

