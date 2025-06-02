export class WebSocketService {
  constructor() {
    this.ws = null
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 2000 // Начальная задержка в мс
    this.subscriptions = new Set()
  }

  connect(onMessage) {
    if (this.ws) this.close()

    this.ws = new WebSocket(import.meta.env.VITE_WS_URL)

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.subscriptions.forEach(channel => this.subscribe(channel))
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error('WebSocket message parsing error:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.handleReconnect(onMessage)
    }

    this.ws.onclose = () => {
      this.handleReconnect(onMessage)
    }
  }

  subscribe(channel) {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.add(channel)
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'subscribe', channel }))
    } else {
      // Ожидаем открытия соединения
      const checkOpen = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ action: 'subscribe', channel }))
          clearInterval(checkOpen)
        }
      }, 100)
    }
  }

  unsubscribe(channel) {
    if (this.subscriptions.has(channel)) {
      this.subscriptions.delete(channel)
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'unsubscribe', channel }))
      }
    }
  }

  close() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
      this.subscriptions.clear()
      this.reconnectAttempts = 0
    }
  }

  handleReconnect(onMessage) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      this.close()
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1)
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect(onMessage)
    }, delay)
  }
}
