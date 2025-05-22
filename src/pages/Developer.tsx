import { useState } from 'react';
import styled from '@emotion/styled';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';
import { createMusicAssistantApi } from '../api/musicAssistant';

const Content = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
`;

const DeveloperContainer = styled.div`
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

const Section = styled.div`
  background: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const SectionTitle = styled.h2`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.lg};
`;

const ApiGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const ApiGroupTitle = styled.h3`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const ApiRoutesContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing.md};
`;

const ApiCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: ${({ theme }) => theme.spacing.md};
  display: flex;
  flex-direction: column;
`;

const ApiTitle = styled.h4`
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  font-size: ${({ theme }) => theme.fontSizes.md};
`;

const ApiDescription = styled.p`
  color: ${({ theme }) => theme.colors.lightText};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  flex-grow: 1;
`;

const Button = styled.button`
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.short};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryDark || theme.colors.primary + 'cc'};
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.lightText};
    cursor: not-allowed;
  }
`;

const EntityIdInput = styled.input`
  padding: ${({ theme }) => theme.spacing.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  width: 100%;
`;

const InfoMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.info + '20'};
  border-left: 3px solid ${({ theme }) => theme.colors.info};
  padding: ${({ theme }) => theme.spacing.md};
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

interface ApiEndpoint {
  title: string;
  description: string;
  group: 'homeAssistant' | 'musicAssistant';
  requiresEntityId?: boolean;
  action: (entityId?: string) => Promise<any>;
}

export const Developer = () => {
  const { api, isConnected } = useHomeAssistant();
  const [entityId, setEntityId] = useState('');

  const apiEndpoints: ApiEndpoint[] = [
    {
      title: 'Get All States',
      description: 'Retrieve all entity states from Home Assistant',
      group: 'homeAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        return await api.getStates();
      }
    },
    {
      title: 'Get Entity State',
      description: 'Retrieve the state of a specific entity by ID',
      group: 'homeAssistant',
      requiresEntityId: true,
      action: async (entityId) => {
        if (!api) throw new Error('API not available');
        if (!entityId) throw new Error('Entity ID is required');
        return await api.getState(entityId);
      }
    },
    {
      title: 'Get Services',
      description: 'Retrieve all available services from Home Assistant',
      group: 'homeAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        return await api.getServices();
      }
    },
    {
      title: 'Get Config',
      description: 'Retrieve Home Assistant configuration information',
      group: 'homeAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        return await api.getConfig();
      }
    },
    {
      title: 'Get Light Entities',
      description: 'Retrieve all light entities from Home Assistant',
      group: 'homeAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        return await api.getEntitiesByDomain('light');
      }
    },
    {
      title: 'Get Switch Entities',
      description: 'Retrieve all switch entities from Home Assistant',
      group: 'homeAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        return await api.getEntitiesByDomain('switch');
      }
    },
    {
      title: 'Get Media Player Entities',
      description: 'Retrieve all media player entities from Home Assistant',
      group: 'homeAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        return await api.getEntitiesByDomain('media_player');
      }
    },
    {
      title: 'Get All Music Assistant Players',
      description: 'Retrieve all Music Assistant players',
      group: 'musicAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        const musicAssistantApi = createMusicAssistantApi(api);
        return await musicAssistantApi.getPlayers();
      }
    },
    {
      title: 'Get Chromecast Players',
      description: 'Retrieve only Chromecast players from Music Assistant',
      group: 'musicAssistant',
      action: async () => {
        if (!api) throw new Error('API not available');
        const musicAssistantApi = createMusicAssistantApi(api);
        return await musicAssistantApi.getChromecastPlayers();
      }
    }
  ];

  const handleApiCall = async (endpoint: ApiEndpoint) => {
    try {
      console.log(`API Call: ${endpoint.title}`);
      console.log('Request parameters:', endpoint.requiresEntityId ? { entityId } : {});

      const result = await endpoint.action(endpoint.requiresEntityId ? entityId : undefined);

      console.log('API Response:');
      console.log(result);
    } catch (error) {
      console.error(`API Error (${endpoint.title}):`, error);
    }
  };

  const homeAssistantEndpoints = apiEndpoints.filter(e => e.group === 'homeAssistant');
  const musicAssistantEndpoints = apiEndpoints.filter(e => e.group === 'musicAssistant');

  function test() {
    fetch("http://192.168.10.5:8123/api/services/music_assistant/search?return_response", {
      method: "POST",
      headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI1ZWZkZjE4YTBjMDE0MGVkYjhlZWRjOGM3MDQ0ZWYwNCIsImlhdCI6MTc0NzQ5NTg3OCwiZXhwIjoyMDYyODU1ODc4fQ.t27hkcJFmNdO0NLhG-l3cAq26CkdDX99hzVU_lRLoh0",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        config_entry_id: "01JVNQP0CB489RGG2EAD1DNZ1V",
        name: "Dave matthews",
        // media_type: "track",
        // artist: "Artist name",
        // album: "Album name",
        limit: 10,
        library_only: false
      })
    })
  }

  return (
    <Content>
      <DeveloperContainer>
        <Header>
          <Title>Developer</Title>
          <Subtitle>Development and debugging tools</Subtitle>
        </Header>

        <InfoMessage>
          All API requests and responses will be logged to the browser console. Open the developer tools (F12) to view the results.
        </InfoMessage>

        <Section>
          <SectionTitle>API Testing</SectionTitle>

          {!isConnected && (
            <p>Not connected to Home Assistant. Please log in first.</p>
          )}

          {isConnected && !api && (
            <p>API not available. Please try reloading the page.</p>
          )}

          {isConnected && api && (
            <>
              <EntityIdInput
                placeholder="Entity ID (e.g., light.living_room)"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
              />
              <ApiCard>
                <ApiTitle>Test API Call</ApiTitle>
                <ApiDescription>Test the API call</ApiDescription>
                <Button
                  onClick={() => test()}
                >
                  Test API Call
                </Button>
              </ApiCard>
              <ApiGroup>
                <ApiGroupTitle>Home Assistant API</ApiGroupTitle>
                <ApiRoutesContainer>
                  {homeAssistantEndpoints.map((endpoint, index) => (
                    <ApiCard key={index}>
                      <ApiTitle>{endpoint.title}</ApiTitle>
                      <ApiDescription>{endpoint.description}</ApiDescription>
                      <Button
                        onClick={() => handleApiCall(endpoint)}
                        disabled={endpoint.requiresEntityId && !entityId}
                      >
                        Test API Call
                      </Button>
                    </ApiCard>
                  ))}
                </ApiRoutesContainer>
              </ApiGroup>

              <ApiGroup>
                <ApiGroupTitle>Music Assistant API</ApiGroupTitle>
                <ApiRoutesContainer>
                  {musicAssistantEndpoints.map((endpoint, index) => (
                    <ApiCard key={index}>
                      <ApiTitle>{endpoint.title}</ApiTitle>
                      <ApiDescription>{endpoint.description}</ApiDescription>
                      <Button onClick={() => handleApiCall(endpoint)}>
                        Test API Call
                      </Button>
                    </ApiCard>
                  ))}
                </ApiRoutesContainer>
              </ApiGroup>
            </>
          )}
        </Section>
      </DeveloperContainer>
    </Content>
  );
};