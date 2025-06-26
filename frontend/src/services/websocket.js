import { io } from 'socket.io-client';

export class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.subscriptions = new Set();
  }

  /**
   * Establishes a WebSocket connection and sets up event handlers.
   * @param {Function} onMessage - Callback to handle incoming WebSocket messages.
   */
  connect(onMessage) {
    if (this.socket) this.close();

    this.socket = io(import.meta.env.VITE_WS_URL + '/', {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
      this.subscriptions.forEach(channel => this.subscribe(channel));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message, 'Namespace:', this.socket.nsp, 'Transport:', this.socket.io.engine.transport.name);
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('message', (data) => {
    });

    this.socket.on('candle', (data) => {
      onMessage({ type: 'candle', symbol: data.instId, candle: data });
    });

    this.socket.on('ticker', (data) => {
      onMessage({ type: 'ticker', symbol: data.instId, price: data.close });
    });

    this.socket.on('disconnect', () => {
    });

    this.socket.on('subscribed', (data) => {
    });

    this.socket.on('unsubscribed', (data) => {
    });
  }

  /**
   * Subscribes to a WebSocket channel for real-time data.
   * @param {string} channel - The channel to subscribe to (e.g., 'candles:TON-USDT:5m').
   */
  subscribe(channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel);
    }

    if (this.socket && this.socket.connected) {
      const [type, instId, bar] = channel.split(':');
      if (type === 'candles' || type === 'ticker') {
        this.socket.emit('subscribe', { instId: instId || 'TON-USDT', bar: bar || '5m' });
      }
    }
  }

  /**
   * Unsubscribes from a WebSocket channel.
   * @param {string} channel - The channel to unsubscribe from (e.g., 'candles:TON-USDT:5m').
   */
  unsubscribe(channel) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel);
      if (this.socket && this.socket.connected) {
        const [type, instId, bar] = channel.split(':');
        this.socket.emit('unsubscribe', { instId: instId || 'TON-USDT', bar: bar || '5m' });
      }
    }
  }

  /**
   * Closes the WebSocket connection and clears subscriptions.
   */
  close() {
    if (this.socket) {
      this.subscriptions.forEach(channel => this.unsubscribe(channel));
      this.socket.disconnect();
      this.socket = null;
      this.subscriptions.clear();
      this.reconnectAttempts = 0;
    }
  }
}
