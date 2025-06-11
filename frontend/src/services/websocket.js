import { io } from 'socket.io-client';

export class WebSocketService {
  constructor() {
    this.socket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.subscriptions = new Set();
  }

  connect(onMessage) {
    if (this.socket) this.close();

    this.socket = io(import.meta.env.VITE_WS_URL, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 2000,
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server', this.socket.id);
      this.reconnectAttempts = 0;
      this.subscriptions.forEach(channel => this.subscribe(channel));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error, 'Namespace:', this.socket.nsp);
    });

    this.socket.on('candle', (data) => {
      console.log('Received candle data:', data);
      onMessage({ type: 'candle', symbol: data.instId, candle: data });
    });

    this.socket.on('ticker', (data) => {
      onMessage({ type: 'ticker', symbol: data.instId, price: data.close });
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });
  }

  subscribe(channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel);
    }

    if (this.socket && this.socket.connected) {
      const [type, instId, bar] = channel.split(':');
      if (type === 'candles') {
        this.socket.emit('subscribe', { instId, bar: bar || '5m' });
      } else if (type === 'ticker') {
        this.socket.emit('subscribe', { instId, bar: '1m' });
      }
    }
  }

  unsubscribe(channel) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel);
      if (this.socket && this.socket.connected) {
        const [type, instId, bar] = channel.split(':');
        this.socket.emit('unsubscribe', { instId, bar });
      }
    }
  }

  close() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.subscriptions.clear();
      this.reconnectAttempts = 0;
    }
  }
}
