export const validateAmount = (value, max, min = 0.01) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'Amount must be a valid number'
  }
  if (value < min) {
    return `Amount must be at least ${min}`
  }
  if (value > max) {
    return `Amount cannot exceed ${max}`
  }
  return true
}

export const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return 'Wallet address is required'
  }
  // Простая проверка формата TON-адреса (48 символов, base64)
  const tonAddressRegex = /^[A-Za-z0-9+/=]{48}$/
  if (!tonAddressRegex.test(address)) {
    return 'Invalid wallet address format'
  }
  return true
}

export const validateTradeType = (type) => {
  if (!['long', 'short'].includes(type)) {
    return 'Trade type must be "long" or "short"'
  }
  return true
}
