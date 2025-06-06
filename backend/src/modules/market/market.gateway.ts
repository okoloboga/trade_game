import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, BadRequestException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';

@WebSocketGateway({ cors: { origin: '*' } }) // В продакшене укажи конкретный origin
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MarketGateway.name);
  private okxWs?: WebSocket;
  private subscriptions: Map<string, Set<Socket>> = new Map(); // Хранит подписки: channel -> клиенты
  private validBars = ['1m', '5m', '15m']; // Допустимые таймфреймы

  constructor() {
    this.connectToOkxWebSocket();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to market WebSocket: ${client.id}`);
    client.emit('message', { message: 'Connected to market WebSocket' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from market WebSocket: ${client.id}`);
    // Удаляем клиента из всех подписок
    this.subscriptions.forEach((clients, channel) => {
      clients.delete(client);
      if (clients.size === 0) {
        this.unsubscribeFromOkx(channel);
        this.subscriptions.delete(channel);
      }
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(client: Socket, @MessageBody() data: { instId: string; bar: string }) {
    const { instId, bar } = data;

    if (!instId || !this.validBars.includes(bar)) {
      client.emit('error', { error: 'Invalid instId or bar' });
      throw new BadRequestException('Invalid instId or bar');
    }

    const channel = `candle${bar}:${instId}`;
    this.logger.log(`Client ${client.id} subscribed to ${channel}`);

    // Добавляем клиента в подписку
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      this.subscribeToOkx(channel);
    }
    this.subscriptions.get(channel)!.add(client);

    client.emit('subscribed', { instId, bar, status: 'subscribed' });
  }

  private subscribeToOkx(channel: string) {
    const [candle, instId] = channel.split(':');
    const bar = candle.replace('candle', '');
    this.okxWs?.send(
      JSON.stringify({
        op: 'subscribe',
        args: [{ channel: `candle${bar}`, instId }],
      }),
    );
    this.logger.log(`Subscribed to OKX ${channel}`);
  }

  private unsubscribeFromOkx(channel: string) {
    const [candle, instId] = channel.split(':');
    const bar = candle.replace('candle', '');
    this.okxWs?.send(
      JSON.stringify({
        op: 'unsubscribe',
        args: [{ channel: `candle${bar}`, instId }],
      }),
    );
    this.logger.log(`Unsubscribed from OKX ${channel}`);
  }

  private connectToOkxWebSocket() {
    const wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
    this.okxWs = new WebSocket(wsUrl);

    this.okxWs.on('open', () => {
      this.logger.log('Connected to OKX WebSocket');
    });

    this.okxWs.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.data && message.arg.channel.startsWith('candle')) {
          const [ts, open, high, low, close] = message.data[0];
          const candle = {
            instId: message.arg.instId,
            bar: message.arg.channel.replace('candle', ''),
            timestamp: parseInt(ts),
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
          };

          const channel = `${message.arg.channel}:${message.arg.instId}`;
          const clients = this.subscriptions.get(channel);
          if (clients) {
            clients.forEach((client: Socket) => {
              if (client.connected) {
                client.emit('candle', candle);
              }
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to process OKX message: ${(error as Error).message}`,
        );
      }
    });

    this.okxWs.on('error', (error) => {
      this.logger.error(`OKX WebSocket error: ${error.message}`);
    });

    this.okxWs.on('close', () => {
      this.logger.log('Disconnected from OKX WebSocket. Reconnecting...');
      setTimeout(() => this.connectToOkxWebSocket(), 5000);
    });
  }
}
