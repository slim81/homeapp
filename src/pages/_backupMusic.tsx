import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { Entity } from '../api/types';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';

const Content = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
`;

const MusicContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const Header = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const Title = styled.h1`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const Subtitle = styled.p`
  color: ${({ theme }) => theme.colors.lightText};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const PlayerGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

const PlayerCard = styled.div`
  background: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all ${({ theme }) => theme.transitions.short};
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const PlayerIcon = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.primary + '20'};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  svg {
    width: 30px;
    height: 30px;
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const PlayerName = styled.h3`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const PlayerType = styled.p`
  margin: ${({ theme }) => theme.spacing.xs} 0;
  color: ${({ theme }) => theme.colors.lightText};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const PlayerInfo = styled.p`
  margin: ${({ theme }) => theme.spacing.sm} 0;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
  justify-content: center;
`;

const ControlButton = styled.button<{ primary?: boolean }>`
  background-color: ${({ primary, theme }) => primary ? theme.colors.primary : 'white'};
  color: ${({ primary, theme }) => primary ? 'white' : theme.colors.text};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: ${({ theme }) => theme.spacing.sm};
  cursor: pointer;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${({ theme }) => theme.transitions.short};
  
  &:hover {
    background-color: ${({ primary, theme }) => primary ? theme.colors.primary + 'cc' : theme.colors.background};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingMessage = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.colors.lightText};
  padding: ${({ theme }) => theme.spacing.xl};
`;

const MessageContainer = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background-color: white;
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const ErrorMessage = styled(MessageContainer)`
  border-left: 5px solid ${({ theme }) => theme.colors.error};
`;

const InfoMessage = styled(MessageContainer)`
  border-left: 5px solid ${({ theme }) => theme.colors.info};
  color: ${({ theme }) => theme.colors.lightText};
`;

const MessageTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MessageText = styled.p`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

// Simple icon for Chromecast devices
const MediaPlayerIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z" />
  </svg>
);

export const Music = () => {
  const { isConnected, api } = useHomeAssistant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaPlayers, setMediaPlayers] = useState<Entity[]>([]);

  useEffect(() => {
    // Load media players when component mounts
    if (isConnected && api) {
      loadMediaPlayers();
    }
  }, [isConnected, api]);

  const loadMediaPlayers = async () => {
    if (!api) {
      setError('Home Assistant API not available');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get media player entities directly from Home Assistant
      const players = await api.getEntitiesByDomain('media_player');
      
      console.log('Retrieved media players:', players);
      
      // If we found players, show them
      setMediaPlayers(players);
      
      // If no media players were found, show a helpful message
      if (players.length === 0) {
        setError('No media players found. Make sure you have media player entities configured in Home Assistant.');
      }
    } catch (err) {
      console.error('Failed to load media players:', err);
      setError('An unexpected error occurred. Please check the console for more details.');
    } finally {
      setLoading(false);
    }
  };

  // Format the player state for display
  const formatPlayerState = (state: string): string => {
    if (state === 'playing') return 'Playing';
    if (state === 'paused') return 'Paused';
    if (state === 'idle') return 'Idle';
    if (state === 'off') return 'Off';
    if (state === 'on') return 'On';
    if (state === 'standby') return 'Standby';
    return state.charAt(0).toUpperCase() + state.slice(1);
  };
  
  // Function to handle player controls
  const handlePlayerControl = async (action: 'play' | 'pause' | 'stop', playerId: string) => {
    if (!api) {
      setError('Home Assistant API not available');
      return;
    }
    
    console.log(`${action} action on player ${playerId}`);
    
    try {
      // Call the appropriate service for the action
      await api.callService('media_player', action, {
        entity_id: playerId
      });
      
      // Refresh the player state after action
      setTimeout(() => {
        loadMediaPlayers();
      }, 1000); // Wait a second for state to update
    } catch (err) {
      console.error(`Failed to ${action} player:`, err);
      setError(`Failed to ${action} player. Please check the console for details.`);
    }
  };
  
  // Function to handle playing media on a player
  const handlePlayMedia = async (playerId: string) => {
    if (!api) {
      setError('Home Assistant API not available');
      return;
    }
    
    // Pre-defined list of songs for demo
    const songs = [
      { title: 'Bohemian Rhapsody', artist: 'Queen' },
      { title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
      { title: 'Hotel California', artist: 'Eagles' },
      { title: 'Sweet Child O\' Mine', artist: 'Guns N\' Roses' },
      { title: 'Imagine', artist: 'John Lennon' }
    ];
    
    const randomSong = songs[Math.floor(Math.random() * songs.length)];
    
    try {
      console.log(`Attempting to play ${randomSong.title} by ${randomSong.artist} on ${playerId}`);
      
      // Use Home Assistant's media_player.play_media service
      await api.callService('media_player', 'play_media', {
        entity_id: playerId,
        media_content_id: `https://example.com/music/${randomSong.title.toLowerCase().replace(/ /g, '_')}.mp3`,
        media_content_type: 'music',
        extra: {
          title: randomSong.title,
          artist: randomSong.artist
        }
      });
      
      // Refresh the player state after action
      setTimeout(() => {
        loadMediaPlayers();
      }, 1000); // Wait a second for state to update
    } catch (err) {
      console.error('Failed to play media:', err);
      setError('Failed to play media. Please check the console for details.');
    }
  };

  return (
    <Content>
      <MusicContainer>
        <Header>
          <Title>Music</Title>
          <Subtitle>Control your media players with Home Assistant</Subtitle>
        </Header>

        {loading && <LoadingMessage>Loading media players...</LoadingMessage>}
        
        {error && !loading && (
          <ErrorMessage>
            <MessageTitle>Media Players Not Available</MessageTitle>
            <MessageText>{error}</MessageText>
          </ErrorMessage>
        )}
        
        {!loading && !error && mediaPlayers.length === 0 && (
          <InfoMessage>
            <MessageTitle>No Media Players Found</MessageTitle>
            <MessageText>
              No media players were detected in your Home Assistant setup.
            </MessageText>
            <MessageText>
              Make sure your media player devices are powered on and connected to the same network as your 
              Home Assistant instance, and properly configured in Home Assistant.
            </MessageText>
          </InfoMessage>
        )}

        {!loading && !error && mediaPlayers.length > 0 && (
          <div>
            <h2>Media Players</h2>
            <PlayerGrid>
              {mediaPlayers.map(player => (
                <PlayerCard key={player.entity_id}>
                  <PlayerIcon>
                    <MediaPlayerIcon />
                  </PlayerIcon>
                  <PlayerName>{player.attributes.friendly_name || player.entity_id}</PlayerName>
                  <PlayerType>{player.attributes.device_class || 'Media Player'}</PlayerType>
                  <PlayerInfo>
                    Status: {formatPlayerState(player.state)}
                  </PlayerInfo>
                  {player.attributes.media_title && (
                    <PlayerInfo>
                      Now Playing: {player.attributes.media_title}
                      {player.attributes.media_artist && ` • ${player.attributes.media_artist}`}
                    </PlayerInfo>
                  )}
                  
                  <ControlsContainer>
                    {player.state === 'playing' ? (
                      <>
                        <ControlButton 
                          onClick={() => handlePlayerControl('pause', player.entity_id)}
                          title="Pause"
                        >
                          ⏸️
                        </ControlButton>
                        <ControlButton 
                          onClick={() => handlePlayerControl('stop', player.entity_id)}
                          title="Stop"
                        >
                          ⏹️
                        </ControlButton>
                      </>
                    ) : (
                      <ControlButton 
                        primary
                        onClick={() => handlePlayerControl('play', player.entity_id)}
                        title="Play"
                        disabled={player.state !== 'paused' && !player.attributes.media_title}
                      >
                        ▶️
                      </ControlButton>
                    )}
                    <ControlButton 
                      onClick={() => handlePlayMedia(player.entity_id)}
                      title="Play Media"
                    >
                      🔊
                    </ControlButton>
                  </ControlsContainer>
                </PlayerCard>
              ))}
            </PlayerGrid>
          </div>
        )}
      </MusicContainer>
    </Content>
  );
};