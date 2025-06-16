import { io } from 'socket.io-client';
import { watch } from 'vue';

export class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.subscriptions = new Set();
  }

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
      console.log('Connected to WebSocket server', this.socket.id, 'Namespace:', this.socket.nsp);
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
      console.log('WebSocket message:', data);
    });

    this.socket.on('candle', (data) => {
      console.log('Received candle data:', data);
      onMessage({ type: 'candle', symbol: data.instId, candle: data });
    });

    this.socket.on('ticker', (data) => {
      console.log('Received ticker data:', data);
      onMessage({ type: 'ticker', symbol: data.instId, price: data.close });
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    this.socket.on('subscribed', (data) => {
      console.log('Subscribed to channel:', data);
    });

    this.socket.on('unsubscribed', (data) => {
      console.log('Unsubscribed from channel:', data);
    });
  }

  subscribe(channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel);
    }

    if (this.socket && this.socket.connected) {
      const [type, instId, bar] = channel.split(':');
      if (type === 'candles' || type === 'ticker') {
        console.log(`Subscribing to channel: ${channel}`);
        this.socket.emit('subscribe', { instId: instId || 'TON-USDT', bar: bar || '5m' });
      }
    }
  }

  unsubscribe(channel) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel);
      if (this.socket && this.socket.connected) {
        const [type, instId, bar] = channel.split(':');
        console.log(`Unsubscribing from channel: ${channel}`);
        this.socket.emit('unsubscribe', { instId: instId || 'TON-USDT', bar: bar || '5m' });
      }
    }
  }

  close() {
    if (this.socket) {
      this.subscriptions.forEach(channel => this.unsubscribe(channel));
      this.socket.disconnect();
      this.socket = null;
      this.subscriptions.clear();
      this.reconnectAttempts = 0;
      console.log('WebSocket connection closed');
    }
  }
}
