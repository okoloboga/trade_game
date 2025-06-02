import { format } from 'date-fns'

export const formatCurrency = (value, currency = 'USD') => {
  if (typeof value !== 'number' || isNaN(value)) return '–'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const formatDate = (date) => {
  if (!date) return '–'
  try {
    return format(new Date(date), 'MMM dd, yyyy HH:mm')
  } catch {
    return '–'
  }
}

export const formatAddress = (address, start = 6, end = 4) => {
  if (!address || typeof address !== 'string') return '–'
  if (address.length < start + end) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export const formatTonAmount = (usdAmount, tonPrice) => {
  if (typeof usdAmount !== 'number' || typeof tonPrice !== 'number' || tonPrice <= 0) {
    return 0
  }
  return parseFloat((usdAmount / tonPrice).toFixed(2))
}
