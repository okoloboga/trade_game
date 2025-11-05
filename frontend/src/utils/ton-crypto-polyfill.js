// Полифил для @ton/crypto в браузере
// Этот модуль используется только в Node.js (backend), в браузере не нужен
// Экспортируем все функции, которые могут быть использованы из @ton/crypto

export const mnemonicToWalletKey = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const mnemonicToSeed = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const keyPairFromSeed = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const keyPairFromSecretKey = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const sign = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const verifySignature = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const encrypt = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

export const decrypt = () => {
  throw new Error('@ton/crypto is not available in browser environment');
};

// Экспортируем все остальные функции как пустые, если они используются
export default {
  mnemonicToWalletKey,
  mnemonicToSeed,
  keyPairFromSeed,
  keyPairFromSecretKey,
  sign,
  verifySignature,
  encrypt,
  decrypt,
};

