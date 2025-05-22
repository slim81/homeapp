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

export const Scenes = () => {
  const { entities } = useHomeAssistant();
  const { toggleScene, isSceneActive } = useScene();
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter only scene entities
  const sceneEntities = entities.filter(entity => 
    entity.entity_id.startsWith('scene.')
  );

  useEffect(() => {
    if (entities.length > 0) {
      setIsLoading(false);
    }
  }, [entities]);

  return (
    <Content>
      {isLoading && <p>Loading scenes...</p>}
      
      {!isLoading && sceneEntities.length === 0 && (
        <EmptyState>
          <h2>No scenes found</h2>
          <p>Create scenes in Home Assistant to see them here.</p>
        </EmptyState>
      )}
      
      {!isLoading && sceneEntities.length > 0 && (
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
    </Content>
  );
};