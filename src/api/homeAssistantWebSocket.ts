/**
 * Home Assistant WebSocket API implementation
 * Based on documentation: https://developers.home-assistant.io/docs/api/websocket/
 */
import { HomeAssistantConfig, Entity, ServiceDomain } from './types';

// WebSocket message types
export const MessageType = {
  AUTH: 'auth',
  AUTH_REQUIRED: 'auth_required',
  AUTH_OK: 'auth_ok',
  AUTH_INVALID: 'auth_invalid',
  RESULT: 'result',
  SUBSCRIBE_EVENTS: 'subscribe_events',
  SUBSCRIBE_ENTITIES: 'subscribe_entities',
  EVENT: 'event',
  CALL_SERVICE: 'call_service',
  GET_STATES: 'get_states',
  GET_SERVICES: 'get_services',
  GET_CONFIG: 'get_config',
  PING: 'ping',
  PONG: 'pong',
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

// Base WebSocket message interface
export interface WebSocketMessage {
  type: string;
  id?: number;
}

// Authentication messages
export interface AuthRequiredMessage extends WebSocketMessage {
  type: typeof MessageType.AUTH_REQUIRED;
  ha_version: string;
}

export interface AuthMessage extends WebSocketMessage {
  type: typeof MessageType.AUTH;
  access_token: string;
}

export interface AuthOkMessage extends WebSocketMessage {
  type: typeof MessageType.AUTH_OK;
  ha_version: string;
}

export interface AuthInvalidMessage extends WebSocketMessage {
  type: typeof MessageType.AUTH_INVALID;
  message: string;
}

// Result message
export interface ResultMessage extends WebSocketMessage {
  type: typeof MessageType.RESULT;
  id: number;
  success: boolean;
  result?: any;
  error?: {
    code: string;
    message: string;
  };
}

// Event message
export interface EventMessage extends WebSocketMessage {
  type: typeof MessageType.EVENT;
  id: number;
  event: {
    event_type: string;
    data: any;
    origin: string;
    time_fired: string;
  };
}

// State changed event data
export interface StateChangedEventData {
  entity_id: string;
  new_state: Entity | null;
  old_state: Entity | null;
}

// Event types
export const EventType = {
  STATE_CHANGED: 'state_changed',
} as const;

export type EventType = typeof EventType[keyof typeof EventType];

// Subscription options
export interface SubscriptionOptions {
  eventType?: EventType;
  entityIds?: string[];
}

// WebSocket connection states
export const ConnectionState = {
  CLOSED: 'closed',
  CONNECTING: 'connecting',
  AUTHENTICATING: 'authenticating',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
} as const;

export type ConnectionState = typeof ConnectionState[keyof typeof ConnectionState];

// Event callback types
export type StateChangedCallback = (entityId: string, newState: Entity | null, oldState: Entity | null) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;
export type ErrorCallback = (error: Error) => void;

/**
 * Home Assistant WebSocket API client
 */
export class HomeAssistantWebSocketApi {
  private baseUrl: string;
  private accessToken: string;
  private socket: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private messageId: number = 1;
  private pendingCommands: Map<number, (result: any) => void> = new Map();
  private stateChangedCallbacks: StateChangedCallback[] = [];
  private connectionStateCallbacks: ConnectionStateCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Initial delay in ms
  
  constructor(config: HomeAssistantConfig) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
  }
  
  /**
   * Connect to the Home Assistant WebSocket API
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
        resolve();
        return;
      }
      
      this.updateConnectionState(ConnectionState.CONNECTING);
      
      // Convert from http/https to ws/wss
      const wsUrl = this.baseUrl.replace(/^http/, 'ws') + '/api/websocket';
      
      try {
        this.socket = new WebSocket(wsUrl);
        
        this.socket.onopen = () => {
          this.reconnectAttempts = 0;
          this.setupHeartbeat();
        };
        
        this.socket.onmessage = (event) => {
          this.handleMessage(event.data, resolve, reject);
        };
        
        this.socket.onclose = () => {
          this.updateConnectionState(ConnectionState.CLOSED);
          this.clearTimers();
          this.attemptReconnect();
        };
        
        this.socket.onerror = (error) => {
          this.updateConnectionState(ConnectionState.ERROR);
          this.notifyError(new Error('WebSocket error: ' + error.toString()));
          reject(error);
        };
      } catch (error) {
        this.updateConnectionState(ConnectionState.ERROR);
        this.notifyError(error instanceof Error ? error : new Error('Unknown error when connecting to WebSocket'));
        reject(error);
      }
    });
  }
  
  /**
   * Disconnect from the Home Assistant WebSocket API
   */
  public disconnect(): void {
    this.clearTimers();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.updateConnectionState(ConnectionState.CLOSED);
  }
  
  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }
  
  /**
   * Send a command to the Home Assistant WebSocket API
   * @param command The command to send
   * @param params The parameters for the command
   * @returns A promise that resolves with the result of the command
   */
  public sendCommand<T>(command: string, params: Record<string, any> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN || this.connectionState !== ConnectionState.CONNECTED) {
        reject(new Error('WebSocket not connected'));
        return;
      }
      
      const id = this.messageId++;
      const message = {
        id,
        type: command,
        ...params,
      };
      
      this.pendingCommands.set(id, (result) => {
        resolve(result as T);
      });
      
      this.socket.send(JSON.stringify(message));
    });
  }
  
  /**
   * Subscribe to state changes for all entities or specific entities
   * @param callback Function to call when entity states change
   * @param entityIds Optional list of entity IDs to monitor
   * @returns A promise that resolves when the subscription is established
   */
  public subscribeEntities(callback: StateChangedCallback, entityIds?: string[]): Promise<number> {
    this.stateChangedCallbacks.push(callback);
    
    // If we're not connected, the subscription will be established after connection
    if (this.connectionState !== ConnectionState.CONNECTED) {
      return Promise.resolve(-1);
    }
    
    return this.sendCommand<number>(MessageType.SUBSCRIBE_EVENTS, {
      event_type: EventType.STATE_CHANGED,
      ...(entityIds ? { entity_ids: entityIds } : {}),
    });
  }
  
  /**
   * Subscribe to connection state changes
   * @param callback Function to call when connection state changes
   */
  public subscribeConnectionState(callback: ConnectionStateCallback): void {
    this.connectionStateCallbacks.push(callback);
    // Immediately notify of current state
    callback(this.connectionState);
  }
  
  /**
   * Subscribe to error events
   * @param callback Function to call when an error occurs
   */
  public subscribeError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
  
  /**
   * Get all entity states
   * @returns A promise that resolves with all entity states
   */
  public async getStates(): Promise<Entity[]> {
    return this.sendCommand<Entity[]>(MessageType.GET_STATES);
  }
  
  /**
   * Get all services
   * @returns A promise that resolves with all available services
   */
  public async getServices(): Promise<ServiceDomain[]> {
    return this.sendCommand<ServiceDomain[]>(MessageType.GET_SERVICES);
  }
  
  /**
   * Get Home Assistant configuration
   * @returns A promise that resolves with the Home Assistant configuration
   */
  public async getConfig(): Promise<any> {
    return this.sendCommand<any>(MessageType.GET_CONFIG);
  }
  
  /**
   * Call a Home Assistant service
   * @param domain Service domain
   * @param service Service name
   * @param data Service data
   * @returns A promise that resolves when the service has been called
   */
  public async callService(domain: string, service: string, data: Record<string, any> = {}): Promise<void> {
    return this.sendCommand<void>(MessageType.CALL_SERVICE, {
      domain,
      service,
      service_data: data,
    });
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string, resolveConnect: () => void, rejectConnect: (error: Error) => void): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;
      
      switch (message.type) {
        case MessageType.AUTH_REQUIRED:
          this.updateConnectionState(ConnectionState.AUTHENTICATING);
          this.authenticate();
          break;
          
        case MessageType.AUTH_OK:
          this.updateConnectionState(ConnectionState.CONNECTED);
          resolveConnect();
          break;
          
        case MessageType.AUTH_INVALID:
          const authInvalid = message as AuthInvalidMessage;
          this.updateConnectionState(ConnectionState.ERROR);
          const error = new Error(`Authentication failed: ${authInvalid.message}`);
          this.notifyError(error);
          rejectConnect(error);
          break;
          
        case MessageType.RESULT:
          const result = message as ResultMessage;
          this.handleResult(result);
          break;
          
        case MessageType.EVENT:
          const event = message as EventMessage;
          this.handleEvent(event);
          break;
          
        case MessageType.PONG:
          // Heartbeat response received, no action needed
          break;
      }
    } catch (error) {
      this.notifyError(error instanceof Error ? error : new Error('Error parsing message: ' + data));
    }
  }
  
  /**
   * Authenticate with the Home Assistant WebSocket API
   */
  private authenticate(): void {
    if (!this.socket) return;
    
    const authMessage: AuthMessage = {
      type: MessageType.AUTH,
      access_token: this.accessToken,
    };
    
    this.socket.send(JSON.stringify(authMessage));
  }
  
  /**
   * Handle result messages
   */
  private handleResult(message: ResultMessage): void {
    const callback = this.pendingCommands.get(message.id);
    
    if (callback) {
      this.pendingCommands.delete(message.id);
      
      if (message.success) {
        callback(message.result);
      } else {
        this.notifyError(new Error(`Command failed: ${message.error?.message || 'Unknown error'}`));
      }
    }
  }
  
  /**
   * Handle event messages
   */
  private handleEvent(message: EventMessage): void {
    const { event } = message;
    
    if (event.event_type === EventType.STATE_CHANGED) {
      const data = event.data as StateChangedEventData;
      
      // Notify all state changed callbacks
      for (const callback of this.stateChangedCallbacks) {
        callback(data.entity_id, data.new_state, data.old_state);
      }
    }
  }
  
  /**
   * Update connection state and notify subscribers
   */
  private updateConnectionState(state: ConnectionState): void {
    if (this.connectionState === state) return;
    
    this.connectionState = state;
    
    // Notify all connection state callbacks
    for (const callback of this.connectionStateCallbacks) {
      callback(state);
    }
  }
  
  /**
   * Notify error subscribers
   */
  private notifyError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }
  
  /**
   * Set up heartbeat to keep connection alive
   */
  private setupHeartbeat(): void {
    this.clearTimers();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const pingMessage = {
          id: this.messageId++,
          type: MessageType.PING,
        };
        
        this.socket.send(JSON.stringify(pingMessage));
      }
    }, 30000); // Send ping every 30 seconds
  }
  
  /**
   * Attempt to reconnect to the WebSocket
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) return;
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateConnectionState(ConnectionState.ERROR);
      this.notifyError(new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`));
      return;
    }
    
    this.updateConnectionState(ConnectionState.RECONNECTING);
    
    // Exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      
      this.connect().catch(() => {
        // If connection fails, the socket's onclose handler will trigger another reconnect attempt
      });
    }, delay);
  }
  
  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}