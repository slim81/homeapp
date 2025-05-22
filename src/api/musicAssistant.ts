/**
 * Music Assistant API client for Home Assistant
 */
import { 
  Entity, 
  MusicAssistantPlayer, 
  MusicAssistantSearchOptions, 
  MusicAssistantSearchResult,
  MusicAssistantSearchType,
  MusicAssistantSearchItem,
  MusicAssistantTrack,
  MusicAssistantAlbum,
  MusicAssistantArtist,
  MusicAssistantPlaylist
} from './types';
import { HomeAssistantApiInterface } from './homeAssistantApi';

// Constants for Music Assistant API
const DEFAULT_INSTANCE_ID = 'Music Assistant';
const MIN_QUERY_LENGTH = 2;
const DEBUG = false; // Set to true to enable verbose logging

export class MusicAssistantApi {
  private api: HomeAssistantApiInterface;

  constructor(api: HomeAssistantApiInterface) {
    this.api = api;
  }

  /**
   * Get all Music Assistant players
   */
  async getPlayers(): Promise<MusicAssistantPlayer[]> {
    try {
      // Get all media player entities from Home Assistant
      const entities = await this.api.getEntitiesByDomain('media_player');
      
      // Filter for Music Assistant players
      const maPlayers = entities.filter(entity => 
        entity.entity_id.startsWith('media_player.ma_')
      );
      
      // Return empty array if no players found
      if (maPlayers.length === 0) {
        console.log('No Music Assistant players found');
        return [];
      }
      
      // Transform to MusicAssistantPlayer format
      return this.transformToMusicAssistantPlayers(maPlayers);
    } catch (error) {
      console.error('Failed to get Music Assistant players:', error);
      throw error;
    }
  }
  

  /**
   * Get only Chromecast players from Music Assistant
   */
  async getChromecastPlayers(): Promise<MusicAssistantPlayer[]> {
    const players = await this.getPlayers();
    
    return players.filter(player => {
      // Check for Chromecast type indicators in the player data
      return player.is_chromecast || 
             player.player_type === 'cast' || 
             player.entity_id.includes('chromecast');
    });
  }

  /**
   * Play media on a Music Assistant player
   */
  async playMedia(
    entityId: string,
    mediaType: 'track' | 'album' | 'artist' | 'playlist' | 'radio',
    mediaId: string,
    enqueue: 'play_now' | 'add_last' | 'add_next' | 'replace_all' = 'play_now',
    radioMode: boolean = false
  ): Promise<void> {
    try {
      await this.api.callService('music_assistant', 'play_media', {
        entity_id: entityId,
        media_type: mediaType,
        media_id: mediaId,
        enqueue: enqueue,
        radio_mode: radioMode
      });
    } catch (error) {
      console.error('Failed to play media on Music Assistant player:', error);
      throw error;
    }
  }
  
  /**
   * Search for music content using Music Assistant through direct REST API
   * with fallback to various endpoint patterns
   */
  async search(options: MusicAssistantSearchOptions): Promise<MusicAssistantSearchResult[]> {
    try {
      // Validate query length
      if (!options.query || options.query.length < MIN_QUERY_LENGTH) {
        throw new Error(`Search query must be at least ${MIN_QUERY_LENGTH} characters long`);
      }

      const baseUrl = this.api.getBaseUrl ? this.api.getBaseUrl() : '';
      const accessToken = this.api.getAccessToken ? this.api.getAccessToken() : '';
      
      if (!baseUrl || !accessToken) {
        throw new Error('Missing configuration details for REST API call');
      }
      
      // Prepare REST API parameters based on example
      const params: Record<string, any> = {
        // Use config_entry_id if provided, otherwise use instance_id
        config_entry_id: options.config_entry_id || options.instance_id || DEFAULT_INSTANCE_ID,
        // Use name instead of search_query as per example (Music Assistant API expects 'name' parameter, but we use 'query' internally)
        name: options.query
      };
      
      // Add optional parameters
      if (options.media_type) {
        params.media_type = options.media_type;
      } else if (options.media_types && options.media_types.length > 0) {
        // If media_types array is provided, use the first one
        params.media_type = options.media_types[0];
      }
      
      if (options.artist) {
        params.artist = options.artist;
      }
      
      if (options.album) {
        params.album = options.album;
      }
      
      if (options.limit) {
        params.limit = options.limit;
      }
      
      if (options.library_only !== undefined) {
        params.library_only = options.library_only;
      }
      
      // Try different endpoints until one works
      const endpoints = [
        'search',        // Primary endpoint from example
        'search_media',  // Common alternative
        'search_library', // Another alternative
        'global_search'  // Final fallback
      ];
      
      let result = null;
      let lastError = null;
      
      // Try each endpoint in order until one works
      for (const endpoint of endpoints) {
        try {
          // Construct the URL for this endpoint
          // Add return_response query parameter as required by Home Assistant
          const url = `${baseUrl}/api/services/music_assistant/${endpoint}?return_response=true`;
          
          DEBUG && console.log(`[Music Search] Trying REST API call to ${url} with params:`, params);
          
          // Make the fetch request
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
          });
          
          if (!response.ok) {
            // Get more detailed error information if available
            const errorText = await response.text();
            console.warn(`[Music Search] ${endpoint} endpoint failed with status ${response.status}: ${errorText}`);
            // Continue to next endpoint, don't throw
            continue;
          }
          
          // If successful, parse the result and return
          result = await response.json();
          DEBUG && console.log(`[Music Search] Successful response from ${endpoint} endpoint:`, result);
          
          // Break the loop since we got a successful response
          break;
        } catch (endpointError) {
          console.warn(`[Music Search] Error with ${endpoint} endpoint:`, endpointError);
          lastError = endpointError;
          // Continue to next endpoint
        }
      }
      
      // If we have a result, process and return it
      if (result) {
        return this.processSearchResults(result);
      }
      
      // If we reached here, all endpoints failed
      throw lastError || new Error('All Music Assistant search endpoints failed');
    } catch (error) {
      console.error('Music Assistant search failed:', error);
      throw error;
    }
  }
  
  /**
   * Process search results from Music Assistant into our expected format
   */
  private processSearchResults(rawResults: any): MusicAssistantSearchResult[] {
    try {
      DEBUG && console.log('[Music Search] Raw results structure:', JSON.stringify(rawResults));
      
      const results: MusicAssistantSearchResult[] = [];
      
      // Handle multiple possible response formats from Music Assistant API
      
      // Format 1: If the result is an object with type-keyed properties (original expected format)
      // Example: { tracks: [...], albums: [...], etc. }
      if (rawResults && typeof rawResults === 'object') {
        // Check for standard format
        if (rawResults.tracks) {
          results.push({
            type: 'track',
            items: this.normalizeSearchItems(rawResults.tracks, 'track')
          });
        }
        
        if (rawResults.albums) {
          results.push({
            type: 'album',
            items: this.normalizeSearchItems(rawResults.albums, 'album')
          });
        }
        
        if (rawResults.artists) {
          results.push({
            type: 'artist',
            items: this.normalizeSearchItems(rawResults.artists, 'artist')
          });
        }
        
        if (rawResults.playlists) {
          results.push({
            type: 'playlist',
            items: this.normalizeSearchItems(rawResults.playlists, 'playlist')
          });
        }
        
        if (rawResults.radio) {
          results.push({
            type: 'radio',
            items: this.normalizeSearchItems(rawResults.radio, 'radio')
          });
        }
        
        // Format 2: If the result contains 'items' with a structure like { items: { tracks: [...], etc. }}
        if (rawResults.items && typeof rawResults.items === 'object') {
          if (rawResults.items.tracks) {
            results.push({
              type: 'track',
              items: this.normalizeSearchItems(rawResults.items.tracks, 'track')
            });
          }
          
          if (rawResults.items.albums) {
            results.push({
              type: 'album',
              items: this.normalizeSearchItems(rawResults.items.albums, 'album')
            });
          }
          
          if (rawResults.items.artists) {
            results.push({
              type: 'artist',
              items: this.normalizeSearchItems(rawResults.items.artists, 'artist')
            });
          }
          
          if (rawResults.items.playlists) {
            results.push({
              type: 'playlist',
              items: this.normalizeSearchItems(rawResults.items.playlists, 'playlist')
            });
          }
          
          if (rawResults.items.radio) {
            results.push({
              type: 'radio',
              items: this.normalizeSearchItems(rawResults.items.radio, 'radio')
            });
          }
        }
        
        // Format 3: If the result is an array of items with type property
        // Example: [{ type: 'track', ... }, { type: 'album', ... }]
        if (Array.isArray(rawResults)) {
          // Group items by type
          const groupedItems: Record<string, any[]> = {};
          
          for (const item of rawResults) {
            if (item.type && typeof item.type === 'string') {
              if (!groupedItems[item.type]) {
                groupedItems[item.type] = [];
              }
              groupedItems[item.type].push(item);
            }
          }
          
          // Create result groups for each type
          for (const [type, items] of Object.entries(groupedItems)) {
            if (['track', 'album', 'artist', 'playlist', 'radio'].includes(type)) {
              results.push({
                type: type as MusicAssistantSearchType,
                items: this.normalizeSearchItems(items, type as MusicAssistantSearchType)
              });
            }
          }
        }
      }
      
      // If we still don't have results and rawResults might be a different format,
      // let's try to extract any useful data
      if (results.length === 0 && rawResults) {
        DEBUG && console.log('[Music Search] No standard format detected, attempting to extract data from response');
        
        // Try to find any arrays or objects that might contain media items
        const extractedItems = this.extractPossibleMediaItems(rawResults);
        
        if (extractedItems.length > 0) {
          results.push({
            type: 'track', // Default to track as fallback
            items: extractedItems
          });
        }
      }
      
      DEBUG && console.log('[Music Search] Processed results:', results);
      return results;
    } catch (error) {
      console.error('Error processing search results:', error);
      return [];
    }
  }
  
  /**
   * Extract possible media items from an unknown structure
   */
  private extractPossibleMediaItems(data: any): MusicAssistantSearchItem[] {
    const items: MusicAssistantSearchItem[] = [];
    
    try {
      if (Array.isArray(data)) {
        // If data is an array, try to convert each item
        for (const item of data) {
          if (typeof item === 'object' && item !== null) {
            // Look for properties that might indicate this is a media item
            if (
              (item.name || item.title) && 
              (item.id || item.item_id || item.media_id)
            ) {
              items.push({
                item_id: item.id || item.item_id || item.media_id || '',
                name: item.name || item.title || '',
                description: item.description || '',
                image_url: item.image_url || item.thumbnail || item.artwork || '',
                type: 'track' // Default type
              });
            } else {
              // Recursively check this item
              const extractedItems = this.extractPossibleMediaItems(item);
              items.push(...extractedItems);
            }
          }
        }
      } else if (typeof data === 'object' && data !== null) {
        // Try to find arrays in the properties
        for (const key of Object.keys(data)) {
          const value = data[key];
          
          if (Array.isArray(value)) {
            // This might be an array of items
            const extractedItems = this.extractPossibleMediaItems(value);
            items.push(...extractedItems);
          } else if (typeof value === 'object' && value !== null) {
            // Recursively check this property
            const extractedItems = this.extractPossibleMediaItems(value);
            items.push(...extractedItems);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting possible media items:', error);
    }
    
    return items;
  }
  
  /**
   * Normalize search items from different formats to our standard format
   */
  private normalizeSearchItems(items: any[], type: MusicAssistantSearchType): MusicAssistantSearchItem[] {
    if (!Array.isArray(items)) {
      return [];
    }
    
    return items.map(item => {
      // Create a base search item
      const baseItem: MusicAssistantSearchItem = {
        item_id: item.item_id || item.id || item.media_id || '',
        name: item.name || item.title || '',
        description: item.description || '',
        image_url: item.image_url || item.thumbnail || item.artwork || '',
        type
      };
      
      // Add type-specific properties
      switch (type) {
        case 'track':
          return {
            ...baseItem,
            artist: item.artist || item.artist_name || '',
            album: item.album || item.album_name || '',
            duration: item.duration || 0
          } as MusicAssistantTrack;
          
        case 'album':
          return {
            ...baseItem,
            artist: item.artist || item.artist_name || '',
            year: item.year || item.release_date || undefined
          } as MusicAssistantAlbum;
          
        case 'artist':
          return {
            ...baseItem,
            genres: item.genres || []
          } as MusicAssistantArtist;
          
        case 'playlist':
          return {
            ...baseItem,
            owner: item.owner || item.provider || '',
            track_count: item.track_count || item.items || 0
          } as MusicAssistantPlaylist;
          
        default:
          return baseItem;
      }
    });
  }
  

  /**
   * Transform Home Assistant entities to MusicAssistantPlayer format
   */
  private transformToMusicAssistantPlayers(entities: Entity[]): MusicAssistantPlayer[] {
    return entities.map(entity => {
      // Extract the core name without the "media_player.ma_" prefix
      const coreName = entity.entity_id.replace('media_player.ma_', '');
      
      // Determine if this is a Chromecast device
      // Look for indicators in entity attributes or entity_id
      const isChromecast = this.isChromecastPlayer(entity);
      
      // Infer player type from entity_id or attributes
      const playerType = this.determinePlayerType(entity);
      
      // Extract supported features
      const supportedFeatures = this.extractSupportedFeatures(entity);
      
      return {
        entity_id: entity.entity_id,
        friendly_name: entity.attributes.friendly_name || coreName,
        is_chromecast: isChromecast,
        player_type: playerType,
        supported_features: supportedFeatures,
        icon: entity.attributes.icon,
        media_image_url: entity.attributes.entity_picture || entity.attributes.media_image_url,
        media_title: entity.attributes.media_title,
        media_artist: entity.attributes.media_artist,
        state: entity.state
      };
    });
  }

  /**
   * Determine if a player is a Chromecast device
   */
  private isChromecastPlayer(entity: Entity): boolean {
    const { entity_id, attributes } = entity;
    
    // Check for cast in entity_id
    if (entity_id.includes('cast') || entity_id.includes('chromecast') || entity_id.includes('google_')) {
      return true;
    }
    
    // Check the model_name or manufacturer
    if (attributes.model_name && 
        (attributes.model_name.toLowerCase().includes('chromecast') || 
         attributes.model_name.toLowerCase().includes('google'))) {
      return true;
    }
    
    if (attributes.manufacturer && 
        (attributes.manufacturer.toLowerCase().includes('google'))) {
      return true;
    }
    
    // Check for app_id or app_name that might indicate Cast
    if (attributes.app_id && attributes.app_id.includes('cast')) {
      return true;
    }
    
    return false;
  }

  /**
   * Determine the type of player from entity information
   */
  private determinePlayerType(entity: Entity): string {
    if (this.isChromecastPlayer(entity)) {
      return 'cast';
    }
    
    const { entity_id, attributes } = entity;
    
    if (entity_id.includes('sonos')) {
      return 'sonos';
    }
    
    if (entity_id.includes('airplay') || entity_id.includes('apple')) {
      return 'airplay';
    }
    
    if (entity_id.includes('dlna')) {
      return 'dlna';
    }
    
    // Default to 'unknown' if we can't determine the type
    return 'unknown';
  }

  /**
   * Extract supported features from entity attributes
   */
  private extractSupportedFeatures(entity: Entity): string[] {
    const supportedFeatures = [];
    
    // Check for common media player features
    // Use the bitmask value from supported_features attribute
    const bitFeatures = entity.attributes.supported_features || 0;
    
    // Common Media Player features bit positions
    // These may not be 100% accurate for Music Assistant but are a good starting point
    if (bitFeatures & 1) supportedFeatures.push('play');
    if (bitFeatures & 2) supportedFeatures.push('pause');
    if (bitFeatures & 4) supportedFeatures.push('stop');
    if (bitFeatures & 8) supportedFeatures.push('next_track');
    if (bitFeatures & 16) supportedFeatures.push('previous_track');
    if (bitFeatures & 32) supportedFeatures.push('volume_set');
    if (bitFeatures & 64) supportedFeatures.push('volume_mute');
    if (bitFeatures & 128) supportedFeatures.push('volume_step');
    if (bitFeatures & 256) supportedFeatures.push('shuffle_set');
    if (bitFeatures & 512) supportedFeatures.push('select_source');
    if (bitFeatures & 1024) supportedFeatures.push('select_sound_mode');
    if (bitFeatures & 2048) supportedFeatures.push('play_media');
    if (bitFeatures & 4096) supportedFeatures.push('seek');
    if (bitFeatures & 8192) supportedFeatures.push('repeat_set');
    if (bitFeatures & 16384) supportedFeatures.push('grouping');
    
    return supportedFeatures;
  }
}

// We'll no longer use a singleton instance since we need to pass the API instance
/**
 * Create the Music Assistant API instance with the provided Home Assistant API
 */
export const createMusicAssistantApi = (
  api: HomeAssistantApiInterface
): MusicAssistantApi => {
  return new MusicAssistantApi(api);
};