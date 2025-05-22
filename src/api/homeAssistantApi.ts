/**
 * Home Assistant API interface and factory
 */
import { 
  HomeAssistantConfig, 
  Entity, 
  ServiceDomain, 
  ApiError
} from './types';
import { HomeAssistantApi as RestApi } from './homeAssistant';
import { 
  HomeAssistantWebSocketApi,
  ConnectionState,
  StateChangedCallback,
  ConnectionStateCallback,
  ErrorCallback
} from './homeAssistantWebSocket';

export const ApiType = {
  REST: 'rest',
  WEBSOCKET: 'websocket',
} as const;

export type ApiType = typeof ApiType[keyof typeof ApiType];

export interface HomeAssistantApiInterface {
  // Core methods
  connect(): Promise<void>;
  disconnect(): void;
  getStates(): Promise<Entity[]>;
  getState(entityId: string): Promise<Entity>;
  getServices(): Promise<ServiceDomain[]>;
  callService(domain: string, service: string, data?: Record<string, any>): Promise<any>;
  getCameraProxyUrl(entityId: string): string;
  getEntitiesByDomain(domain: string): Promise<Entity[]>;
  
  // Subscription methods (WebSocket specific, REST will simulate)
  subscribeToEntities(callback: StateChangedCallback, entityIds?: string[]): Promise<number | null>;
  subscribeToConnectionState(callback: ConnectionStateCallback): void;
  subscribeToErrors(callback: ErrorCallback): void;
  
  // Status methods
  isConnected(): boolean;
  getConnectionState(): ConnectionState;
  
  // Config and authentication methods (for direct API calls)
  getConfig?(): Promise<any>;
  getBaseUrl?(): string;
  getAccessToken?(): string;
}

/**
 * REST API adapter that implements the unified interface
 */
class RestApiAdapter implements HomeAssistantApiInterface {
  private api: RestApi;
  private config: HomeAssistantConfig;
  private connected: boolean = false;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private entityCallbacks: StateChangedCallback[] = [];
  private connectionCallbacks: ConnectionStateCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private lastStates: Map<string, Entity> = new Map();
  private pollingFrequency: number = 3000; // In milliseconds
  
  constructor(config: HomeAssistantConfig) {
    this.config = config;
    this.api = new RestApi(config);
  }
  
  // Config and authentication methods
  async getConfig(): Promise<any> {
    return this.api.getConfig();
  }
  
  getBaseUrl(): string {
    return this.config.baseUrl;
  }
  
  getAccessToken(): string {
    return this.config.accessToken;
  }
  
  async connect(): Promise<void> {
    try {
      // Test connection by getting states
      await this.api.getStates();
      this.connected = true;
      
      // Notify connection callbacks
      this._notifyConnectionState(ConnectionState.CONNECTED);
      
      // Start polling if we have subscribers
      if (this.entityCallbacks.length > 0) {
        this._startPolling();
      }
      
      return Promise.resolve();
    } catch (error) {
      this.connected = false;
      this._notifyConnectionState(ConnectionState.ERROR);
      this._notifyError(error instanceof Error ? error : new Error('Unknown error during connection'));
      return Promise.reject(error);
    }
  }
  
  disconnect(): void {
    this.connected = false;
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this._notifyConnectionState(ConnectionState.CLOSED);
  }
  
  async getStates(): Promise<Entity[]> {
    try {
      return await this.api.getStates();
    } catch (error) {
      this._handleApiError(error);
      throw error;
    }
  }
  
  async getState(entityId: string): Promise<Entity> {
    try {
      return await this.api.getState(entityId);
    } catch (error) {
      this._handleApiError(error);
      throw error;
    }
  }
  
  async getServices(): Promise<ServiceDomain[]> {
    try {
      return await this.api.getServices();
    } catch (error) {
      this._handleApiError(error);
      throw error;
    }
  }
  
  async callService(domain: string, service: string, data?: Record<string, any>): Promise<any> {
    try {
      return await this.api.callService(domain, service, data);
    } catch (error) {
      this._handleApiError(error);
      throw error;
    }
  }
  
  getCameraProxyUrl(entityId: string): string {
    return this.api.getCameraProxyUrl(entityId);
  }
  
  async getEntitiesByDomain(domain: string): Promise<Entity[]> {
    try {
      return await this.api.getEntitiesByDomain(domain);
    } catch (error) {
      this._handleApiError(error);
      throw error;
    }
  }
  
  async subscribeToEntities(callback: StateChangedCallback, entityIds?: string[]): Promise<number | null> {
    this.entityCallbacks.push(callback);
    
    // Start polling if not already started
    if (this.connected && !this.pollingInterval) {
      this._startPolling();
    }
    
    return Promise.resolve(null); // REST API doesn't have subscription IDs
  }
  
  subscribeToConnectionState(callback: ConnectionStateCallback): void {
    this.connectionCallbacks.push(callback);
    
    // Notify immediately of current state
    callback(this.isConnected() ? ConnectionState.CONNECTED : ConnectionState.CLOSED);
  }
  
  subscribeToErrors(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getConnectionState(): ConnectionState {
    return this.connected ? ConnectionState.CONNECTED : ConnectionState.CLOSED;
  }
  
  // Helper methods
  private _startPolling(): void {
    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Initial fetch
    this._pollEntities();
    
    // Set up regular polling
    this.pollingInterval = setInterval(() => this._pollEntities(), this.pollingFrequency);
  }
  
  private async _pollEntities(): Promise<void> {
    if (!this.connected || this.entityCallbacks.length === 0) return;
    
    try {
      const entities = await this.api.getStates();
      
      // Check for changes and notify callbacks
      for (const entity of entities) {
        const entityId = entity.entity_id;
        const oldState = this.lastStates.get(entityId);
        
        // Skip if no change
        if (oldState && 
            oldState.state === entity.state && 
            JSON.stringify(oldState.attributes) === JSON.stringify(entity.attributes)) {
          continue;
        }
        
        // Notify all callbacks
        for (const callback of this.entityCallbacks) {
          callback(entityId, entity, oldState || null);
        }
        
        // Update stored state
        this.lastStates.set(entityId, entity);
      }
    } catch (error) {
      this._handleApiError(error);
    }
  }
  
  private _handleApiError(error: any): void {
    // Check if it's a connection error
    if (error instanceof Error) {
      this._notifyError(error);
      
      const apiError = error as ApiError;
      if (apiError.status === 401) {
        // Unauthorized - disconnect
        this.disconnect();
      } else if (apiError.status === undefined || apiError.status >= 500) {
        // Server error or network error - might be temporary
        this._notifyConnectionState(ConnectionState.ERROR);
      }
    }
  }
  
  private _notifyConnectionState(state: ConnectionState): void {
    for (const callback of this.connectionCallbacks) {
      callback(state);
    }
  }
  
  private _notifyError(error: Error): void {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }
}

/**
 * WebSocket API adapter that implements the unified interface
 */
class WebSocketApiAdapter implements HomeAssistantApiInterface {
  private api: HomeAssistantWebSocketApi;
  private config: HomeAssistantConfig;
  
  constructor(config: HomeAssistantConfig) {
    this.config = config;
    this.api = new HomeAssistantWebSocketApi(config);
  }
  
  // Config and authentication methods
  async getConfig(): Promise<any> {
    // Use the API's getConfig if available, otherwise mock a basic config
    if (this.api.getConfig) {
      return this.api.getConfig();
    }
    return {
      location: this.config.baseUrl,
      // Include other config properties as needed
    };
  }
  
  getBaseUrl(): string {
    return this.config.baseUrl;
  }
  
  getAccessToken(): string {
    return this.config.accessToken;
  }
  
  async connect(): Promise<void> {
    try {
      return await this.api.connect();
    } catch (error) {
      throw error;
    }
  }
  
  disconnect(): void {
    this.api.disconnect();
  }
  
  async getStates(): Promise<Entity[]> {
    return this.api.getStates();
  }
  
  async getState(entityId: string): Promise<Entity> {
    // WebSocket API doesn't have a direct getState method, so we need to get all states and filter
    const states = await this.api.getStates();
    const entity = states.find(e => e.entity_id === entityId);
    
    if (!entity) {
      throw new Error(`Entity not found: ${entityId}`);
    }
    
    return entity;
  }
  
  async getServices(): Promise<ServiceDomain[]> {
    return this.api.getServices();
  }
  
  async callService(domain: string, service: string, data?: Record<string, any>): Promise<any> {
    return this.api.callService(domain, service, data || {});
  }
  
  getCameraProxyUrl(entityId: string): string {
    // WebSocket API doesn't provide this directly - use the REST URL format
    return `${this.config.baseUrl}/api/camera_proxy/${entityId}?token=${this.config.accessToken}`;
  }
  
  async getEntitiesByDomain(domain: string): Promise<Entity[]> {
    const states = await this.api.getStates();
    return states.filter(entity => entity.entity_id.startsWith(domain + '.'));
  }
  
  async subscribeToEntities(callback: StateChangedCallback, entityIds?: string[]): Promise<number | null> {
    return this.api.subscribeEntities(callback, entityIds);
  }
  
  subscribeToConnectionState(callback: ConnectionStateCallback): void {
    this.api.subscribeConnectionState(callback);
  }
  
  subscribeToErrors(callback: ErrorCallback): void {
    this.api.subscribeError(callback);
  }
  
  isConnected(): boolean {
    return this.api.getConnectionState() === ConnectionState.CONNECTED;
  }
  
  getConnectionState(): ConnectionState {
    return this.api.getConnectionState();
  }
}

// Factory to create the appropriate API instance
export class HomeAssistantApiFactory {
  static create(config: HomeAssistantConfig, type: ApiType = ApiType.REST): HomeAssistantApiInterface {
    if (type === ApiType.WEBSOCKET) {
      return new WebSocketApiAdapter(config);
    } else {
      return new RestApiAdapter(config);
    }
  }
}