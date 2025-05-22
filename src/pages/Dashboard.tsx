import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';
import { useScene } from '../contexts/SceneContext';
import { SceneCard } from '../components/SceneCard';

const Content = styled.main`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.lg};
  overflow-y: auto;
`;

const Title = styled.h1`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing.xl};
  color: ${({ theme }) => theme.colors.lightText};
`;

export const Dashboard = () => {
  const { entities, error: apiError } = useHomeAssistant();
  const { toggleScene, isSceneActive } = useScene();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter only scene entities
  const sceneEntities = entities.filter(entity => 
    entity.entity_id.startsWith('scene.')
  );
  
  // Set loading to false once we have entities
  useEffect(() => {
    if (entities.length > 0) {
      setIsLoading(false);
    }
  }, [entities]);
  
  // Update local error state when API error changes
  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  return (
    <Content>
      {isLoading && <p>Loading...</p>}
      {(error || apiError) && <p>Error: {error || apiError}</p>}
      
      {!isLoading && !error && (
        <>
          <Title>Scenes</Title>
          
          {sceneEntities.length === 0 ? (
            <EmptyState>
              <h2>No scenes found</h2>
              <p>Create scenes in Home Assistant to see them here.</p>
            </EmptyState>
          ) : (
            <Grid>
              {sceneEntities.map(scene => (
                <SceneCard 
                  key={scene.entity_id}
                  scene={scene}
                  active={isSceneActive(scene.entity_id)}
                  onClick={() => toggleScene(scene.entity_id)}
                />
              ))}
            </Grid>
          )}
        </>
      )}
    </Content>
  );
};