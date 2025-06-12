import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, BadRequestException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import WebSocket from 'ws';

@WebSocketGateway({
  transports: ['websocket', 'polling'],
})
export class MarketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MarketGateway.name);
  private okxWs?: WebSocket;
  private subscriptions: Map<string, Set<Socket>> = new Map();
  private validBars = ['1m', '5m', '15m'];

  constructor() {
    this.connectToOkxWebSocket();
  }

  afterInit() {
    this.logger.log('WebSocket server initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}, Args: ${JSON.stringify(args)}, Namespace: ${client.nsp.name}`);
    client.emit('message', { message: 'Connected to market WebSocket' });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket: ${client.id}`);
    this.subscriptions.forEach((clients, channel) => {
      clients.delete(client);
      if (clients.size === 0) {
        this.unsubscribeFromOkx(channel);
        this.subscriptions.delete(channel);
      }
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { instId: string; bar: string }) {
    this.logger.log(`Subscribe data received: ${JSON.stringify(data)}`);
    if (!data) {
      client.emit('error', { error: 'Missing subscription data' });
      throw new BadRequestException('Missing subscription data');
    }

    const { instId, bar } = data;

    if (!instId) {
      client.emit('error', { error: 'Invalid instId' });
      throw new BadRequestException('Invalid instId');
    }

    if (!bar || !this.validBars.includes(bar)) {
      client.emit('error', { error: 'Invalid bar' });
      throw new BadRequestException('Invalid bar');
    }

    const candleChannel = `candle${bar}:${instId}`;
    this.logger.log(`Client ${client.id} subscribed to ${candleChannel}`);

    if (!this.subscriptions.has(candleChannel)) {
      this.subscriptions.set(candleChannel, new Set());
      this.subscribeToOkx(candleChannel);
    }
    this.subscriptions.get(candleChannel)!.add(client);

    if (bar === '1m') {
      const tickerChannel = `ticker:${instId}`;
      if (!this.subscriptions.has(tickerChannel)) {
        this.subscriptions.set(tickerChannel, new Set());
      }
      this.subscriptions.get(tickerChannel)!.add(client);
    }

    client.emit('subscribed', { instId, bar, status: 'subscribed' });
  }

  private sendTickerUpdate(instId: string, price: number) {
    const tickerChannel = `ticker:${instId}`;
    const clients = this.subscriptions.get(tickerChannel);
    if (clients) {
      const tickerData = {
        instId,
        close: price,
        timestamp: Date.now(),
      };
      clients.forEach((client: Socket) => {
        if (client.connected) {
          client.emit('ticker', tickerData);
        }
      });
    }
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
          this.sendTickerUpdate(message.arg.instId, candle.close);
        }
      } catch (error) {
        this.logger.error(`Failed to process OKX message: ${(error as Error).message}`);
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
