export const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return 'Wallet address is required';
  }
  // Поддержка raw-формата (0:hex) и user-friendly (base64)
  const rawAddressRegex = /^0:[0-9a-fA-F]{64}$/;
  const userFriendlyRegex = /^[A-Za-z0-9+/=]{48}$/;
  if (!rawAddressRegex.test(address) && !userFriendlyRegex.test(address)) {
    return 'Invalid wallet address format';
  }
  return true;
};

export const validateAmount = (value, max, min) => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'Invalid amount';
  }
  const num = Number(value);
  if (num < min) {
    return `Amount must be at least ${min}`;
  }
  if (max !== Infinity && num > max) {
    return `Amount cannot exceed ${max}`;
  }
  return true;
};

export function validateTradeType(value) {
  if (!['buy', 'sell'].includes(value)) return 'Invalid trade type';
  return true;
}
