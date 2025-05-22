import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';
import { createMusicAssistantApi } from '../api/musicAssistant';
import { 
  MusicAssistantSearchResult, 
  MusicAssistantSearchItem,
  MusicAssistantTrack,
  MusicAssistantAlbum,
  MusicAssistantArtist,
  MusicAssistantPlaylist,
  MusicAssistantPlayer
} from '../api/types';
import { debounce } from '../utils/debounce';

// Styled components
const Content = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
  background-color: ${({ theme }) => theme.colors.background};
`;

const MusicContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: ${({ theme }) => theme.spacing.xl};
`;

const Header = styled.header`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const SearchContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 800px;
  margin: ${({ theme }) => theme.spacing.lg} 0;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.xl}`};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  border: 1px solid #ddd;
  font-size: ${({ theme }) => theme.fontSizes.md};
  background-color: white;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding-left: ${({ theme }) => theme.spacing.xxl};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: ${({ theme }) => theme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.lightText};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.xl};
`;

const MediaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    display: flex;
    overflow-x: auto;
    padding-bottom: ${({ theme }) => theme.spacing.md};
    
    &::-webkit-scrollbar {
      height: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background-color: ${({ theme }) => theme.colors.lightText};
      border-radius: ${({ theme }) => theme.borderRadius.sm};
    }
  }
`;

const MediaCard = styled.div`
  border-radius: ${({ theme }) => theme.borderRadius.md};
  overflow: hidden;
  background: white;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: all ${({ theme }) => theme.transitions.short};
  cursor: pointer;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    min-width: 160px;
    width: 160px;
  }
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.md};
    
    .play-button {
      opacity: 1;
    }
  }
`;

const MediaThumbnail = styled.div`
  width: 100%;
  padding-top: 56.25%; /* 16:9 aspect ratio */
  position: relative;
`;

const MediaThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
`;

const PlayButton = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity ${({ theme }) => theme.transitions.short};
  color: white;
  font-size: 2rem;
`;

const MediaInfo = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
`;

const MediaTitle = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  color: ${({ theme }) => theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const MediaSubtitle = styled.p`
  margin: ${({ theme }) => theme.spacing.xs} 0 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.lightText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

// Styled component for the welcome message
const WelcomeContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  background-color: ${({ theme }) => theme.colors.background};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  margin: ${({ theme }) => theme.spacing.xl} 0;
`;

const WelcomeTitle = styled.h2`
  margin-bottom: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const WelcomeText = styled.p`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  line-height: 1.5;
`;

// Icons
const SearchIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const PlayIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const CloseIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// Modal components
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.lg};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const ModalCloseButton = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.spacing.md};
  right: ${({ theme }) => theme.spacing.md};
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  padding: ${({ theme }) => theme.spacing.xs};
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.border};
  }
`;

const ModalHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const ModalItemInfo = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.lg};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    flex-direction: column;
  }
`;

const ModalItemImage = styled.img`
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.mobile}) {
    width: 100%;
    height: auto;
  }
`;

const ModalItemDetails = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
`;

const ModalSubtitle = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.lightText};
  font-weight: normal;
`;

const ModalDescription = styled.p`
  margin: ${({ theme }) => theme.spacing.sm} 0 0;
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
`;

const PlayerSelector = styled.div`
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const PlayerSelectorTitle = styled.h4`
  margin: 0 0 ${({ theme }) => theme.spacing.sm};
  color: ${({ theme }) => theme.colors.text};
`;

const PlayersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.sm};
`;

const PlayerItem = styled.div<{ isSelected: boolean }>`
  padding: ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  background-color: ${({ isSelected, theme }) => isSelected ? `${theme.colors.primary}10` : 'transparent'};
  border: 1px solid ${({ isSelected, theme }) => isSelected ? theme.colors.primary : 'transparent'};
  
  &:hover {
    background-color: ${({ theme, isSelected }) => isSelected ? `${theme.colors.primary}20` : `${theme.colors.border}50`};
  }
`;

const PlayerName = styled.div`
  font-weight: 500;
`;

const PlayerInfo = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.lightText};
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.md};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const Button = styled.button<{ primary?: boolean }>`
  background-color: ${({ theme, primary }) => primary ? theme.colors.primary : 'transparent'};
  color: ${({ theme, primary }) => primary ? 'white' : theme.colors.text};
  border: 1px solid ${({ theme, primary }) => primary ? 'transparent' : theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.lg}`};
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  
  &:hover {
    background-color: ${({ theme, primary }) => primary ? theme.colors.primaryDark : theme.colors.border};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.lightText};
    cursor: not-allowed;
  }
`;

const NoPlayersMessage = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.lightText};
  text-align: center;
  font-style: italic;
`;

// Loading indicator
const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.xl};
`;

const SearchResultsContainer = styled.div`
  margin-top: ${({ theme }) => theme.spacing.xl};
`;

const NoResultsMessage = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.lightText};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const StatusIndicator = styled.div<{ status: 'available' | 'unavailable' | 'checking' }>`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  padding: ${({ theme }) => `${theme.spacing.xs} ${theme.spacing.sm}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  
  background-color: ${({ status, theme }) => 
    status === 'available' ? theme.colors.success + '20' : 
    status === 'unavailable' ? theme.colors.error + '20' : 
    theme.colors.warning + '20'
  };
  
  color: ${({ status, theme }) => 
    status === 'available' ? theme.colors.success : 
    status === 'unavailable' ? theme.colors.error : 
    theme.colors.warning
  };
  
  &::before {
    content: '';
    display: block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${({ status, theme }) => 
      status === 'available' ? theme.colors.success : 
      status === 'unavailable' ? theme.colors.error : 
      theme.colors.warning
    };
  }
`;

export const Music = () => {
  const { isConnected, api } = useHomeAssistant();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MusicAssistantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [musicAssistantStatus, setMusicAssistantStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [musicAssistantServiceDetails, setMusicAssistantServiceDetails] = useState<{
    serviceName: string;
    instanceId: string;
  }>({
    serviceName: 'search',
    instanceId: '01JVNQP0CB489RGG2EAD1DNZ1V'
  });
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MusicAssistantSearchItem | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<MusicAssistantPlayer[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);

  // Check if Music Assistant service is available
  useEffect(() => {
    const checkMusicAssistantService = async () => {
      if (!api) {
        return;
      }
      
      try {
        
        
        // Try to get available services
        const services = await api.getServices();
        
        
        // Add warning if services is falsy
        if (!services) {
          console.warn('[Music Search] No services returned from API');
        }
        
        // Enhanced logging to understand services structure
        
        
        // Check if Music Assistant services exist
        let hasMusicAssistantService = false;
        let musicAssistantServiceName = 'search';
        let musicAssistantInstanceId = '';
        
        // Handle if services is an array (expected format)
        if (Array.isArray(services)) {
          // Look for music_assistant domain
          const musicAssistantDomain = services.find(domain => domain.domain === 'music_assistant');
          
          if (musicAssistantDomain && musicAssistantDomain.services) {
          
              
            // Check for various possible service names
            if (Object.keys(musicAssistantDomain.services).includes('search')) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search';
            } else if (Object.keys(musicAssistantDomain.services).includes('search_library')) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search_library';
            } else if (Object.keys(musicAssistantDomain.services).includes('search_media')) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search_media';
            } else if (Object.keys(musicAssistantDomain.services).includes('global_search')) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'global_search';
            }
            
            // Try to find config_entry_id field if available
            if (hasMusicAssistantService && 
                musicAssistantDomain.services[musicAssistantServiceName] && 
                musicAssistantDomain.services[musicAssistantServiceName].fields) {
              const fields = musicAssistantDomain.services[musicAssistantServiceName].fields;
              
              // Look for either config_entry_id (correct param) or instance_id (old param)
              if (fields.config_entry_id && fields.config_entry_id.example) {
                musicAssistantInstanceId = fields.config_entry_id.example;
                
              } else if (fields.instance_id && fields.instance_id.example) {
                musicAssistantInstanceId = fields.instance_id.example;
                
              }
              
              // If we have selector options, try to use the first one
              if (fields.config_entry_id && 
                  fields.config_entry_id.selector && 
                  fields.config_entry_id.selector.config_entry && 
                  fields.config_entry_id.selector.config_entry.integration === 'music_assistant') {
                musicAssistantInstanceId = 'Music Assistant'; // Default value for most installations
                
              }
            }
          }
        }
        // Handle if services is an object with domain keys
        else if (services && typeof services === 'object') {
          if (services.music_assistant && services.music_assistant.services) {
            const maServices = services.music_assistant.services;
            
              
            // Check for various possible service names
            if (maServices.search) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search';
            } else if (maServices.search_library) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search_library';
            } else if (maServices.search_media) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search_media';
            } else if (maServices.global_search) {
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'global_search';
            }
            
            // Try to find config_entry_id field if available
            if (hasMusicAssistantService && 
                maServices[musicAssistantServiceName] && 
                maServices[musicAssistantServiceName].fields) {
              const fields = maServices[musicAssistantServiceName].fields;
              
              // Look for either config_entry_id (correct param) or instance_id (old param)
              if (fields.config_entry_id && fields.config_entry_id.example) {
                musicAssistantInstanceId = fields.config_entry_id.example;
                
              } else if (fields.instance_id && fields.instance_id.example) {
                musicAssistantInstanceId = fields.instance_id.example;
                
              }
              
              // If no example found, try default value
              if (!musicAssistantInstanceId) {
                musicAssistantInstanceId = 'Music Assistant'; // Default value for most installations
                
              }
            }
          }
        }
        
        // If we didn't find the service directly, check for Music Assistant entities instead
        if (!hasMusicAssistantService) {
          
          
          try {
            // Check if there are any Music Assistant media player entities available
            const entities = await api.getEntitiesByDomain('media_player');
            const maEntities = entities.filter(entity => entity.entity_id.startsWith('media_player.ma_'));
            
            if (maEntities.length > 0) {
          
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search'; // Assume 'search' is the service name
              musicAssistantInstanceId = 'Music Assistant'; // Default value for most installations
          
            } else {
          
              
              // Last resort - just assume it's available with default config
          
              hasMusicAssistantService = true;
              musicAssistantServiceName = 'search';
              musicAssistantInstanceId = 'Music Assistant'; // Default value for most installations
            }
          } catch (entitiesError) {
          
            hasMusicAssistantService = false;
          }
        }
        
        // Store detected instance ID globally for later use (service name not needed with REST API)
        setMusicAssistantServiceDetails({
          serviceName: 'search', // Default to 'search', but this is not used with REST API
          instanceId: musicAssistantInstanceId
        });
        
        
        setMusicAssistantStatus(hasMusicAssistantService ? 'available' : 'unavailable');
        
        if (hasMusicAssistantService) {
          console.log('[Music Search] Music Assistant search service is available');
        } else {
          console.warn('[Music Search] Music Assistant search service not found');
          setError('Music Assistant search service not available. Please make sure Music Assistant is properly installed and configured in your Home Assistant instance.');
        }
      } catch (err) {
        console.error('[Music Search] Error checking Music Assistant service:', err);
        setMusicAssistantStatus('unavailable');
        setError('Failed to check Music Assistant service availability.');
      }
    };
    
    if (isConnected && api) {
      checkMusicAssistantService();
    }
  }, [isConnected, api]); // Removed musicAssistantApi from dependencies

  // Create Music Assistant API instance (memoize to prevent recreation)
  const musicAssistantApi = api ? createMusicAssistantApi(api) : null;
  
  /**
   * Process the service response into the format expected by the UI
   */
  function processServiceResponse(serviceResponse: any): MusicAssistantSearchResult[] {
    const results: MusicAssistantSearchResult[] = [];
    
    // Process each category (artists, albums, tracks, etc.)
    const categories = [
      { type: 'artist', items: serviceResponse.artists || [] },
      { type: 'album', items: serviceResponse.albums || [] },
      { type: 'track', items: serviceResponse.tracks || [] },
      { type: 'playlist', items: serviceResponse.playlists || [] },
      { type: 'radio', items: serviceResponse.radio || [] }
    ];
    
    // Add only non-empty categories to results
    categories.forEach(category => {
      if (category.items.length > 0) {
        results.push({
          type: category.type,
          items: category.items.map(item => transformItem(item, category.type))
        });
      }
    });
    
    return results;
  }

  /**
   * Transform an item to the expected format
   */
  function transformItem(item: any, type: string): MusicAssistantSearchItem {
    const baseItem: MusicAssistantSearchItem = {
      item_id: item.uri || '',
      name: item.name || '',
      description: item.version || '',
      image_url: item.image || '',
      type: type
    };
    
    // Add type-specific properties
    switch (type) {
      case 'track':
        return {
          ...baseItem,
          artist: item.artists && item.artists.length > 0 ? item.artists[0].name : '',
          album: item.album ? item.album.name : '',
          duration: 0 // Duration not provided in the sample
        } as MusicAssistantTrack;
        
      case 'album':
        return {
          ...baseItem,
          artist: item.artists && item.artists.length > 0 ? item.artists[0].name : '',
          year: '' // Year not provided in the sample
        } as MusicAssistantAlbum;
        
      case 'artist':
        return {
          ...baseItem,
          genres: [] // Genres not provided in the sample
        } as MusicAssistantArtist;
        
      case 'playlist':
        return {
          ...baseItem,
          owner: '',
          track_count: 0 // Track count not provided in the sample
        } as MusicAssistantPlaylist;
        
      default:
        return baseItem;
    }
  }
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2 || !musicAssistantApi) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }
      
      try {
        setIsSearching(true);
        setError(null);
        
        
        
        // Check if Music Assistant is available before searching
        if (musicAssistantStatus !== 'available') {
          console.warn('[Music Search] Music Assistant is not available');
          setError('Music Assistant is not available. Please make sure it is properly installed and configured.');
          setSearchResults([]);
          setShowSearchResults(true);
          setIsSearching(false);
          return;
        }
        
        
        // Set up a timeout to handle long-running searches
        const searchTimeout = 10000; // 10 seconds
        let searchTimedOut = false;
        let searchTimeoutId: ReturnType<typeof setTimeout>;
        
        // Create a timeout promise that resolves after the specified time
        const timeoutPromise = new Promise<MusicAssistantSearchResult[]>((resolve, reject) => {
          searchTimeoutId = setTimeout(() => {
            searchTimedOut = true;
            console.warn(`[Music Search] Search timed out after ${searchTimeout}ms`);
            reject(new Error('Search operation timed out'));
          }, searchTimeout);
        });
        
        // Try both search and search_library services if available
        let results: MusicAssistantSearchResult[] = [];
        let searchError: Error | null = null;
        
        const searchPromise = (async () => {
          try {
            // Use direct fetch call similar to the test() function in Developer.tsx
            const haUrl = api.getBaseUrl ? api.getBaseUrl() : this.baseUrl;
            const accessToken = api.getAccessToken ? api.getAccessToken() : '';
            
            
            
            const response = await fetch(`${haUrl}/api/services/music_assistant/search?return_response`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                config_entry_id: "01JVNQP0CB489RGG2EAD1DNZ1V",
                name: query, // The test() function uses "name" instead of "query"
                limit: 10,
                library_only: false
              })
            });
            
            if (!response.ok) {
              throw new Error(`Search failed with status: ${response.status}`);
            }
            
            const rawResponse = await response.json();
            
            
            // Extract service_response if it exists
            const serviceResponse = rawResponse.service_response || rawResponse;
            
            // Transform the service_response into MusicAssistantSearchResult[] format
            const transformedResults = processServiceResponse(serviceResponse);
            results = transformedResults;
            return transformedResults;
          } catch (searchError) {
            console.warn(`[Music Search] Search failed:`, searchError);
            throw searchError instanceof Error ? searchError : new Error('Unknown search error');
          }
        })();
        
        try {
          // Race between the search and the timeout
          results = await Promise.race([searchPromise, timeoutPromise]);
          

          // Clear the timeout if search completes before timeout
          clearTimeout(searchTimeoutId);
        } catch (timeoutErr) {
          // Handle the timeout error
          console.error('[Music Search] Search operation timed out');
          results = [];
        }
        
        // If we have results, show them
        if (results.length > 0) {
          setSearchResults(results);
          setShowSearchResults(true);
        } 
        // If no results but also no error, show a friendly "no results" message
        else {
          
          setSearchResults([]);
          
          // Check for specific error patterns that might indicate a configuration issue
          if (searchError && searchError instanceof Error) {
            const errorMsg = searchError.message.toLowerCase();
            if (errorMsg.includes('500') || errorMsg.includes('server') || errorMsg.includes('error')) {
              setError(`Music Assistant server error. Please check if Music Assistant is installed and properly configured in your Home Assistant instance.`);
            } else if (errorMsg.includes('400') || errorMsg.includes('bad request')) {
              setError(`Invalid request to Music Assistant. The search parameters may be incorrect or not supported by your Music Assistant version.`);
            } else if (errorMsg.includes('all') && errorMsg.includes('endpoints') && errorMsg.includes('failed')) {
              setError(`Unable to connect to Music Assistant. Please check if it's installed and enabled in your Home Assistant instance.`);
            } else {
              setError(`No results found for "${query}"`);
            }
          } else {
            setError(`No results found for "${query}"`);
          }
          
          setShowSearchResults(true);
        }
      } catch (err) {
        console.error('[Music Search] Search failed:', err);
        
        // Show more detailed error message to the user
        if (err instanceof Error) {
          const errorMessage = err.message || 'Unknown error';
          console.error('[Music Search] Error details:', errorMessage);
          
          if (errorMessage.includes('config_entry_id')) {
            setError('Search failed: Instance ID is missing or invalid.');
          } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
            setError('Search failed: Music Assistant service not found. Please check if Music Assistant is installed in your Home Assistant instance.');
          } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
            setError('Search failed: Permission denied.');
          } else if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
            setError('Search failed: Connection timed out.');
          } else if (errorMessage.includes('500') || errorMessage.includes('internal server error')) {
            setError('Search failed: Music Assistant server error. Please check if Music Assistant is properly configured.');
          } else if (errorMessage.includes('all') && errorMessage.includes('endpoints') && errorMessage.includes('failed')) {
            setError('Search failed: Unable to connect to Music Assistant. Please check if it\'s installed and enabled.');
          } else {
            setError(`Search failed: ${errorMessage.replace(/^Error:\s*/i, '')}`);
          }
        } else {
          setError('Search failed due to an unknown error.');
        }
        
        // Set empty results when there's an error
        setSearchResults([]);
        setShowSearchResults(true);
      } finally {
        setIsSearching(false);
      }
    }, 500), // 500ms debounce
    [musicAssistantStatus, musicAssistantServiceDetails, setMusicAssistantServiceDetails]
    // Removed musicAssistantApi from dependencies to prevent circular dependency
  );
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.length >= 2) {
      debouncedSearch(query);
    } else {
      setShowSearchResults(false);
    }
  };
  
  // Handle opening the media details modal
  const handleOpenMediaModal = async (item: MusicAssistantSearchItem) => {
    if (!musicAssistantApi || !api) {
      setError('Music Assistant API not available');
      return;
    }
    
    setSelectedItem(item);
    setIsLoadingPlayers(true);
    setIsModalOpen(true);
    setSelectedPlayerId(null);
    
    try {
      // Get available media players
      const players = await musicAssistantApi.getPlayers();
      console.log('[Music Search] Available players:', players);
      
      setAvailablePlayers(players);
      
      // Auto-select the first player if available
      if (players.length > 0) {
        setSelectedPlayerId(players[0].entity_id);
      }
    } catch (err) {
      console.error('[Music Search] Failed to fetch players:', err);
      setError('Failed to fetch media players. Please check the console for details.');
    } finally {
      setIsLoadingPlayers(false);
    }
  };
  
  // Close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setSelectedPlayerId(null);
  };
  
  // Handle selecting a player
  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId);
  };
  
  // Handle playing a track or media item
  const handlePlayMedia = async () => {
    if (!musicAssistantApi || !api || !selectedItem || !selectedPlayerId) {
      setError('Missing required information to play media');
      return;
    }
    
    try {
      console.log(`[Music Search] Playing ${selectedItem.name} on player ${selectedPlayerId}`);
      
      // Play the selected media on the selected player
      await musicAssistantApi.playMedia(
        selectedPlayerId,
        selectedItem.type,
        selectedItem.item_id,
        'play_now',
        false
      );
      
      // Close the modal after successful playback initiation
      handleCloseModal();
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error('[Music Search] Failed to play media:', err);
      setError('Failed to play media. Please check the console for details.');
    }
  };
  
  // Convert track duration from seconds to MM:SS format
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Render different item types
  const renderSearchItem = (item: MusicAssistantSearchItem) => {
    let subtitle = '';
    
    // Set subtitle based on item type
    switch (item.type) {
      case 'track':
        const track = item as MusicAssistantTrack;
        subtitle = `${track.artist} • ${track.album} • ${formatDuration(track.duration)}`;
        break;
      case 'album':
        const album = item as MusicAssistantAlbum;
        subtitle = album.artist;
        break;
      case 'artist':
        const artist = item as MusicAssistantArtist;
        subtitle = artist.genres ? artist.genres.join(', ') : '';
        break;
      case 'playlist':
        const playlist = item as MusicAssistantPlaylist;
        subtitle = `${playlist.track_count} songs`;
        break;
      default:
        subtitle = item.description || '';
    }
    
    return (
      <MediaCard key={item.item_id} onClick={() => handleOpenMediaModal(item)}>
        <MediaThumbnail>
          <MediaThumbnailImage src={`${item.image_url}`} alt={item.name} referrerPolicy='no-referrer' crossOrigin='anonymous'/>
          <PlayButton className="play-button">
            <PlayIconSVG />
          </PlayButton>
        </MediaThumbnail>
        <MediaInfo>
          <MediaTitle>{item.name}</MediaTitle>
          <MediaSubtitle>{subtitle}</MediaSubtitle>
        </MediaInfo>
      </MediaCard>
    );
  };
  
  // Get item details for the modal
  const getItemDetails = () => {
    if (!selectedItem) return { title: '', subtitle: '', description: '' };
    
    let subtitle = '';
    let description = '';
    
    switch (selectedItem.type) {
      case 'track':
        const track = selectedItem as MusicAssistantTrack;
        subtitle = track.artist;
        description = `Album: ${track.album || 'Unknown'}\nDuration: ${formatDuration(track.duration)}`;
        break;
      case 'album':
        const album = selectedItem as MusicAssistantAlbum;
        subtitle = album.artist;
        description = album.description || '';
        break;
      case 'artist':
        const artist = selectedItem as MusicAssistantArtist;
        subtitle = artist.genres?.join(', ') || 'Artist';
        description = artist.description || '';
        break;
      case 'playlist':
        const playlist = selectedItem as MusicAssistantPlaylist;
        subtitle = 'Playlist';
        description = `${playlist.track_count || 'Unknown number of'} songs`;
        break;
      default:
        subtitle = selectedItem.type || '';
        description = selectedItem.description || '';
    }
    
    return {
      title: selectedItem.name,
      subtitle,
      description
    };
  };

  return (
    <Content>
      <MusicContainer>
        <Header>
          <Title>Music</Title>
          
          <SearchContainer>
            <SearchIcon>
              <SearchIconSVG />
            </SearchIcon>
            <SearchInput 
              type="text" 
              placeholder="Search for songs, artists, or playlists..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <StatusIndicator 
              status={musicAssistantStatus}
              title={
                musicAssistantStatus === 'available' 
                  ? 'Music Assistant search is available' 
                  : musicAssistantStatus === 'unavailable'
                  ? 'Music Assistant search is not available'
                  : 'Checking Music Assistant availability'
              }
            >
              {musicAssistantStatus === 'available' 
                ? 'MA Ready' 
                : musicAssistantStatus === 'unavailable'
                ? 'MA Unavailable'
                : 'MA Checking...'}
            </StatusIndicator>
          </SearchContainer>
        </Header>

        {/* Show error message if there's an error and not showing search results */}
        {error && !isSearching && !(showSearchResults && searchQuery.length >= 2) && (
          <NoResultsMessage>
            {error}
          </NoResultsMessage>
        )}
        
        {/* Show loading indicator while searching */}
        {isSearching && (
          <LoadingOverlay>
            <p>Searching...</p>
          </LoadingOverlay>
        )}
        
        {/* Show search results when available or no results message */}
        {showSearchResults && !isSearching && searchQuery.length >= 2 && (
          <>
            {searchResults.length > 0 ? (
              <SearchResultsContainer>
                {searchResults.map(resultGroup => (
                  <Section key={resultGroup.type}>
                    <SectionTitle>
                      {resultGroup.type.charAt(0).toUpperCase() + resultGroup.type.slice(1)}s
                    </SectionTitle>
                    <MediaGrid>
                      {resultGroup.items.map(item => renderSearchItem(item))}
                    </MediaGrid>
                  </Section>
                ))}
              </SearchResultsContainer>
            ) : (
              <NoResultsMessage>
                No results found for "{searchQuery}"
              </NoResultsMessage>
            )}
          </>
        )}
        
        {/* Show welcome message when not searching */}
        {!showSearchResults && (
          <WelcomeContainer>
            <WelcomeTitle>Welcome to Music Assistant</WelcomeTitle>
            <WelcomeText>
              Use the search box above to find music. You can search for songs, artists, albums, or playlists.
            </WelcomeText>
            <WelcomeText>
              When you find something you like, click on it to play on your preferred media player.
            </WelcomeText>
          </WelcomeContainer>
        )}
        
        {/* Media Details Modal */}
        {isModalOpen && selectedItem && (
          <ModalOverlay onClick={handleCloseModal}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <ModalCloseButton onClick={handleCloseModal}>
                <CloseIconSVG />
              </ModalCloseButton>
              
              <ModalHeader>
                <ModalItemInfo>
                  <ModalItemImage 
                    src={selectedItem.image_url} 
                    alt={selectedItem.name}
                    referrerPolicy='no-referrer'
                    crossOrigin='anonymous'
                  />
                  <ModalItemDetails>
                    <ModalTitle>{getItemDetails().title}</ModalTitle>
                    <ModalSubtitle>{getItemDetails().subtitle}</ModalSubtitle>
                    <ModalDescription>
                      {getItemDetails().description.split('\n').map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                    </ModalDescription>
                  </ModalItemDetails>
                </ModalItemInfo>
              </ModalHeader>
              
              <PlayerSelector>
                <PlayerSelectorTitle>Select a player</PlayerSelectorTitle>
                
                {isLoadingPlayers ? (
                  <LoadingOverlay>
                    <p>Loading players...</p>
                  </LoadingOverlay>
                ) : availablePlayers.length > 0 ? (
                  <PlayersList>
                    {availablePlayers.map(player => (
                      <PlayerItem 
                        key={player.entity_id} 
                        isSelected={selectedPlayerId === player.entity_id}
                        onClick={() => handlePlayerSelect(player.entity_id)}
                      >
                        <PlayerName>{player.friendly_name}</PlayerName>
                        <PlayerInfo>
                          {player.player_type} • {player.state || 'unknown state'}
                        </PlayerInfo>
                      </PlayerItem>
                    ))}
                  </PlayersList>
                ) : (
                  <NoPlayersMessage>
                    No media players available. Please check if Music Assistant is configured correctly.
                  </NoPlayersMessage>
                )}
              </PlayerSelector>
              
              <ModalActions>
                <Button onClick={handleCloseModal}>Cancel</Button>
                <Button 
                  primary 
                  onClick={handlePlayMedia}
                  disabled={!selectedPlayerId || availablePlayers.length === 0}
                >
                  Play
                </Button>
              </ModalActions>
            </ModalContent>
          </ModalOverlay>
        )}
      </MusicContainer>
    </Content>
  );
};