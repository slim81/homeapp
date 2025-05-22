import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Entity, ServiceDomain } from '../api/types';
import { HomeAssistantApiFactory, ApiType, HomeAssistantApiInterface } from '../api/homeAssistantApi';
import { ConnectionState } from '../api/homeAssistantWebSocket';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface HomeAssistantContextType {
  isConnected: boolean;
  isConnecting: boolean;
  connect: (baseUrl: string, accessToken: string, apiType?: ApiType) => Promise<void>;
  disconnect: () => void;
  error: string | null;
  entities: Entity[];
  services: ServiceDomain[];
  callService: (domain: string, service: string, data?: Record<string, any>) => Promise<any>;
  getEntity: (entityId: string) => Entity | undefined;
  getEntitiesByDomain: (domain: string) => Entity[];
  refreshEntities: () => Promise<Entity[]>;
  getCameraProxyUrl: (entityId: string) => string;
  api: HomeAssistantApiInterface | null; // Expose API for developer tools
}

const HomeAssistantContext = createContext<HomeAssistantContextType | undefined>(undefined);

export const useHomeAssistant = () => {
  const context = useContext(HomeAssistantContext);
  if (!context) {
    throw new Error('useHomeAssistant must be used within a HomeAssistantProvider');
  }
  return context;
};

interface HomeAssistantProviderProps {
  children: ReactNode;
}

interface StoredConfig {
  baseUrl: string;
  accessToken: string;
  apiType?: ApiType; // Optional to maintain backward compatibility
}

export const HomeAssistantProvider = ({ children }: HomeAssistantProviderProps) => {
  const [api, setApi] = useState<HomeAssistantApiInterface | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [services, setServices] = useState<ServiceDomain[]>([]);
  const [storedConfig, setStoredConfig] = useLocalStorage<StoredConfig | null>('homeAssistant', null);

  // Handle connection state changes
  const handleConnectionStateChange = useCallback((state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        break;
      case ConnectionState.CONNECTING:
      case ConnectionState.AUTHENTICATING:
      case ConnectionState.RECONNECTING:
        setIsConnecting(true);
        break;
      case ConnectionState.CLOSED:
        setIsConnected(false);
        setIsConnecting(false);
        break;
      case ConnectionState.ERROR:
        setIsConnected(false);
        setIsConnecting(false);
        // Error message will be set by the error handler
        break;
    }
  }, []);

  // Handle API errors
  const handleApiError = useCallback((err: Error) => {
    setError(err.message);
    console.error('Home Assistant API error:', err);
  }, []);

  // Handle entity state changes
  const handleEntityStateChange = useCallback((entityId: string, newState: Entity | null, oldState: Entity | null) => {
    if (!newState) return;
    
    setEntities(prevEntities => {
      // Replace the entity in the array if it exists, otherwise add it
      const index = prevEntities.findIndex(e => e.entity_id === entityId);
      if (index >= 0) {
        const updatedEntities = [...prevEntities];
        updatedEntities[index] = newState;
        return updatedEntities;
      } else {
        return [...prevEntities, newState];
      }
    });
  }, []);

  const refreshEntities = async (): Promise<Entity[]> => {
    if (!api || !isConnected) return entities;
    
    try {
      const newEntities = await api.getStates();
      setEntities(newEntities);
      return newEntities;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh entities');
      throw err;
    }
  };
  
  const loadServices = async () => {
    if (!api || !isConnected) return;
    
    try {
      const services = await api.getServices();
      setServices(services);
      return services;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load services');
      throw err;
    }
  };

  const getEntity = (entityId: string) => {
    return entities.find(entity => entity.entity_id === entityId);
  };

  const getEntitiesByDomain = (domain: string) => {
    return entities.filter(entity => entity.entity_id.startsWith(domain + '.'));
  };

  const callService = async (domain: string, service: string, data?: Record<string, any>) => {
    if (!api) throw new Error('API not initialized');
    
    try {
      const result = await api.callService(domain, service, data);
      // For REST API only - WebSocket API will update via subscription
      if (api.getConnectionState() !== ConnectionState.CONNECTED) {
        await refreshEntities();
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to call service ${domain}.${service}`);
      throw err;
    }
  };

  const connect = async (baseUrl: string, accessToken: string, apiType: ApiType = ApiType.REST) => {
    try {
      setIsConnecting(true);
      setError(null);
      
      // Create new API instance
      const apiInstance = HomeAssistantApiFactory.create({ baseUrl, accessToken }, apiType);
      setApi(apiInstance);
      
      // Set up subscriptions before connecting
      apiInstance.subscribeToConnectionState(handleConnectionStateChange);
      apiInstance.subscribeToErrors(handleApiError);
      apiInstance.subscribeToEntities(handleEntityStateChange);
      
      // Connect to the API
      await apiInstance.connect();
      
      // Load initial data
      const states = await apiInstance.getStates();
      setEntities(states);
      
      // Load services
      const serviceData = await apiInstance.getServices();
      setServices(serviceData);
      
      // Store credentials and API type
      setStoredConfig({ baseUrl, accessToken, apiType });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Home Assistant');
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    if (api) {
      api.disconnect();
      setApi(null);
      setEntities([]);
      setServices([]);
      setStoredConfig(null);
    }
  };

  const getCameraProxyUrl = (entityId: string) => {
    if (!api) throw new Error('API not initialized');
    return api.getCameraProxyUrl(entityId);
  };

  // Try to connect using stored credentials on mount
  useEffect(() => {
    if (storedConfig && !isConnected && !isConnecting && !api) {
      const { baseUrl, accessToken, apiType = ApiType.REST } = storedConfig;
      connect(baseUrl, accessToken, apiType).catch(err => {
        console.error('Failed to connect with stored credentials:', err);
      });
    }
  }, [storedConfig, isConnected, isConnecting, api]);

  return (
    <HomeAssistantContext.Provider value={{
      isConnected,
      isConnecting,
      connect,
      disconnect,
      error,
      entities,
      services,
      callService,
      getEntity,
      getEntitiesByDomain,
      refreshEntities,
      getCameraProxyUrl,
      api
    }}>
      {children}
    </HomeAssistantContext.Provider>
  );
};