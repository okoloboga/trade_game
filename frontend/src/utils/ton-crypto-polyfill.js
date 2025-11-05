// Полифил для @ton/crypto в браузере
// Этот модуль используется только в Node.js (backend), в браузере не нужен
// Экспортируем все функции, которые могут быть использованы из @ton/crypto

import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';

// sha256_sync использует crypto-js для синхронного вычисления SHA-256 хеша в браузере
export const sha256_sync = (data) => {
  // Преобразуем данные в формат, который понимает crypto-js
  let wordArray;
  
  if (data instanceof Buffer) {
    // Преобразуем Buffer в WordArray через hex строку
    wordArray = CryptoJS.enc.Hex.parse(data.toString('hex'));
  } else if (data instanceof Uint8Array) {
    // Преобразуем Uint8Array в WordArray через hex строку
    const hex = Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    wordArray = CryptoJS.enc.Hex.parse(hex);
  } else if (typeof data === 'string') {
    wordArray = CryptoJS.enc.Utf8.parse(data);
  } else if (data instanceof ArrayBuffer) {
    const uint8Array = new Uint8Array(data);
    const hex = Array.from(uint8Array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    wordArray = CryptoJS.enc.Hex.parse(hex);
  } else {
    // Пытаемся преобразовать в WordArray напрямую
    wordArray = data;
  }
  
  // Вычисляем SHA-256 хеш синхронно
  const hash = CryptoJS.SHA256(wordArray);
  
  // Преобразуем результат в Buffer
  const hashHex = hash.toString(CryptoJS.enc.Hex);
  return Buffer.from(hashHex, 'hex');
};

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
  sha256_sync,
  mnemonicToWalletKey,
  mnemonicToSeed,
  keyPairFromSeed,
  keyPairFromSecretKey,
  sign,
  verifySignature,
  encrypt,
  decrypt,
};

