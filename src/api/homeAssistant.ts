/**
 * Home Assistant REST API client
 */
import { 
  HomeAssistantConfig,
  Entity, 
  ServiceDomain, 
  ApiError,
  groupEntitiesByDomain
} from './types';

// Re-export the types for backward compatibility
export type {
  HomeAssistantConfig,
  Entity,
  ServiceDomain,
  ApiError
};

// Re-export the helper function
export { groupEntitiesByDomain };

export class HomeAssistantApi {
  private baseUrl: string;
  private accessToken: string;

  constructor(config: HomeAssistantConfig) {
    this.baseUrl = config.baseUrl;
    this.accessToken = config.accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = new ApiError(`API request failed: ${response.status} ${response.statusText}`);
        error.status = response.status;
        error.statusText = response.statusText;
        throw error;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Unknown error occurred during API request');
    }
  }

  /**
   * Get all entity states from Home Assistant
   */
  async getStates(): Promise<Entity[]> {
    return this.request<Entity[]>('/api/states');
  }

  /**
   * Get a specific entity state by ID
   */
  async getState(entityId: string): Promise<Entity> {
    return this.request<Entity>(`/api/states/${entityId}`);
  }

  /**
   * Get all available services
   */
  async getServices(): Promise<ServiceDomain[]> {
    return this.request<ServiceDomain[]>('/api/services');
  }

  /**
   * Call a Home Assistant service
   */
  async callService(domain: string, service: string, data?: Record<string, any>): Promise<Entity[]> {
    return this.request<Entity[]>(`/api/services/${domain}/${service}`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  /**
   * Update an entity state
   */
  async updateState(entityId: string, state: string, attributes?: Record<string, any>): Promise<Entity> {
    return this.request<Entity>(`/api/states/${entityId}`, {
      method: 'POST',
      body: JSON.stringify({
        state,
        attributes: attributes || {},
      }),
    });
  }

  /**
   * Get configuration information
   */
  async getConfig(): Promise<any> {
    return this.request('/api/config');
  }

  /**
   * Get history for an entity or all entities
   */
  async getHistory(timestamp?: string, entityIds?: string | string[]): Promise<any> {
    let url = '/api/history/period';
    
    if (timestamp) {
      url += `/${timestamp}`;
    }
    
    const params = new URLSearchParams();
    
    if (entityIds) {
      if (Array.isArray(entityIds)) {
        entityIds.forEach(id => params.append('filter_entity_id', id));
      } else {
        params.append('filter_entity_id', entityIds);
      }
    }
    
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    return this.request(url);
  }


  /**
   * Get camera proxy URL for a camera entity
   */
  getCameraProxyUrl(entityId: string): string {
    return `${this.baseUrl}/api/camera_proxy/${entityId}?token=${this.accessToken}`;
  }

  /**
   * Get entities by domain (e.g., 'light', 'switch')
   */
  async getEntitiesByDomain(domain: string): Promise<Entity[]> {
    const states = await this.getStates();
    return states.filter(entity => entity.entity_id.startsWith(domain + '.'));
  }
}

// Singleton instance that will be initialized with actual values in a context provider
let apiInstance: HomeAssistantApi | null = null;

/**
 * Initialize the Home Assistant API singleton
 */
export const initializeApi = (config: HomeAssistantConfig): HomeAssistantApi => {
  apiInstance = new HomeAssistantApi(config);
  return apiInstance;
};

/**
 * Get the Home Assistant API singleton instance
 * @throws Error if the API hasn't been initialized
 */
export const getApi = (): HomeAssistantApi => {
  if (!apiInstance) {
    throw new Error('Home Assistant API not initialized. Call initializeApi first.');
  }
  return apiInstance;
};

/**
 * Helper function to determine if the API has been initialized
 */
export const isApiInitialized = (): boolean => {
  return apiInstance !== null;
};