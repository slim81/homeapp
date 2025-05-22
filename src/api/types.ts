/**
 * Common types for Home Assistant API
 */
 
/**
 * Music Assistant specific types
 */
export interface MusicAssistantPlayer {
  entity_id: string;
  friendly_name: string;
  is_chromecast: boolean;
  player_type: string;
  supported_features: string[];
  icon?: string;
  media_image_url?: string;
  media_title?: string;
  media_artist?: string;
  state: string; // playing, paused, idle
}

export type MusicAssistantSearchType = 'track' | 'album' | 'artist' | 'playlist' | 'radio';

export interface MusicAssistantSearchOptions {
  query: string;
  config_entry_id?: string; // Used for direct REST API calls
  media_type?: MusicAssistantSearchType; // Single media type for direct REST API
  service_name?: string; // Used for WebSocket service calls
  instance_id?: string; // Legacy parameter, might be needed for compatibility
  media_types?: MusicAssistantSearchType[]; // Multiple media types for WebSocket
  artist?: string; // Optional filter when searching for tracks/albums
  album?: string; // Optional filter when searching for tracks
  limit?: number; 
  offset?: number;
  library_only?: boolean; // Only include results in your library
  filter?: string;
  sort?: string;
}

export interface MusicAssistantSearchResult {
  type: MusicAssistantSearchType;
  items: MusicAssistantSearchItem[];
}

export interface MusicAssistantSearchItem {
  item_id: string;
  name: string;
  description?: string;
  image_url?: string;
  type: MusicAssistantSearchType;
}

export interface MusicAssistantTrack extends MusicAssistantSearchItem {
  type: 'track';
  artist: string;
  album: string;
  duration: number; // in seconds
}

export interface MusicAssistantAlbum extends MusicAssistantSearchItem {
  type: 'album';
  artist: string;
  year?: number;
}

export interface MusicAssistantArtist extends MusicAssistantSearchItem {
  type: 'artist';
  genres?: string[];
}

export interface MusicAssistantPlaylist extends MusicAssistantSearchItem {
  type: 'playlist';
  owner?: string;
  track_count: number;
}

export interface HomeAssistantConfig {
  baseUrl: string;
  accessToken: string;
}

export interface Entity {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

export interface ServiceDomain {
  domain: string;
  services: Record<string, ServiceDetail>;
}

export interface ServiceDetail {
  name: string;
  description: string;
  fields: Record<string, {
    name: string;
    description: string;
    required?: boolean;
    example?: any;
    selector?: any;
  }>;
}

// Define ApiError as a class rather than interface to ensure it's properly exported
export class ApiError extends Error {
  status?: number;
  statusText?: string;
  
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Group entities by domain for easier access
 */
export function groupEntitiesByDomain(entities: Entity[]): Record<string, Entity[]> {
  const domains: Record<string, Entity[]> = {};
  
  entities.forEach(entity => {
    const [domain] = entity.entity_id.split('.');
    if (!domains[domain]) {
      domains[domain] = [];
    }
    domains[domain].push(entity);
  });
  
  return domains;
}