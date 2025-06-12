import { Address } from '@ton/core';

export const validateAmount = (value, max, min = 0.01) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Amount must be a valid number';
  }
  if (value < min) {
    return `Amount must be at least ${min}`;
  }
  if (value > max) {
    return `Amount cannot exceed ${max}`;
  }
  return true;
};

export const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return 'Wallet address is required';
  }
  try {
    // Проверяем raw-формат (0:hex) или user-friendly (base64)
    Address.parse(address);
    return true;
  } catch (error) {
    return 'Invalid wallet address format';
  }
};

export const validateTradeType = (type) => {
  if (!['long', 'short'].includes(type)) {
    return 'Trade type must be "long" or "short"';
  }
  return true;
};
