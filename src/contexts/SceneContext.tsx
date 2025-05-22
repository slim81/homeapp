import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useHomeAssistant } from './HomeAssistantContext';
import type { Entity } from '../api/types';

// Interface for storing original entity states
export interface EntityState {
  entityId: string;
  state: string;
  attributes: Record<string, any>;
}

// Interface for tracking active scenes
export interface ActiveSceneState {
  sceneId: string;
  originalStates: EntityState[];
}

interface SceneContextType {
  activeScenes: Record<string, ActiveSceneState>;
  toggleScene: (sceneId: string) => Promise<void>;
  activateScene: (sceneId: string) => Promise<void>;
  deactivateScene: (sceneId: string) => Promise<void>;
  isSceneActive: (sceneId: string) => boolean;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

export const useScene = () => {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScene must be used within a SceneProvider');
  }
  return context;
};

interface SceneProviderProps {
  children: ReactNode;
}

export const SceneProvider = ({ children }: SceneProviderProps) => {
  const { entities, callService, getEntity, refreshEntities } = useHomeAssistant();
  const [activeScenes, setActiveScenes] = useState<Record<string, ActiveSceneState>>({});

  // Get affected entities for a scene
  const getSceneEntities = (scene: Entity): string[] => {
    if (!scene.attributes.entities) {
      console.warn('Scene has no entities defined:', scene.entity_id);
      return [];
    }
    
    return Object.keys(scene.attributes.entities);
  };
  
  // Store current state of entities before activating scene
  const captureEntityStates = (entityIds: string[]): EntityState[] => {
    const states = entityIds.map(entityId => {
      const entity = getEntity(entityId);
      if (!entity) {
        console.warn(`Entity ${entityId} not found when capturing state`);
        return { entityId, state: 'unknown', attributes: {} };
      }
      
      // Create a clean copy of the attributes, focusing on the ones we care about
      const attributes: Record<string, any> = {};
      
      // For lights, capture brightness, color_temp, and rgb_color if they exist
      if (entityId.startsWith('light.')) {
        if (entity.attributes.brightness !== undefined) {
          attributes.brightness = entity.attributes.brightness;
        }
        if (entity.attributes.color_temp !== undefined) {
          attributes.color_temp = entity.attributes.color_temp;
        }
        if (entity.attributes.rgb_color !== undefined) {
          attributes.rgb_color = entity.attributes.rgb_color;
        }
      } else {
        // For other entities, copy only necessary attributes
        // This avoids issues with circular references or non-serializable properties
        Object.assign(attributes, entity.attributes);
      }
      
      return {
        entityId,
        state: entity.state,
        attributes: attributes
      };
    });
    
    return states.filter(state => state !== null);
  };

  // Check if a scene is active
  const isSceneActive = (sceneId: string): boolean => {
    return !!activeScenes[sceneId];
  };

  // Toggle a scene (activate or deactivate)
  const toggleScene = async (sceneId: string) => {
    try {
      if (isSceneActive(sceneId)) {
        // Deactivate scene - restore original states
        await deactivateScene(sceneId);
      } else {
        // Activate scene
        await activateScene(sceneId);
      }
    } catch (error) {
      console.error('Failed to toggle scene:', error);
    }
  };
  
  // Activate a scene
  const activateScene = async (sceneId: string) => {
    try {
      const sceneEntity = getEntity(sceneId);
      if (!sceneEntity) throw new Error(`Scene ${sceneId} not found`);
      
      // Get affected entities and capture their current states
      const affectedEntityIds = getSceneEntities(sceneEntity);
      
      // Make sure we get the latest state of entities before storing
      await refreshEntities();
      
      const originalStates = captureEntityStates(affectedEntityIds);
      
      // Update UI immediately for responsiveness
      setActiveScenes(prev => ({
        ...prev,
        [sceneId]: { sceneId, originalStates }
      }));
      
      // Call the scene.turn_on service
      await callService('scene', 'turn_on', { 
        entity_id: sceneId 
      });
      
    } catch (error) {
      console.error('Failed to activate scene:', error);
      
      // Remove from active scenes on error
      setActiveScenes(prev => {
        const newState = { ...prev };
        delete newState[sceneId];
        return newState;
      });
    }
  };
  
  // Deactivate a scene by restoring original entity states
  const deactivateScene = async (sceneId: string) => {
    try {
      const activeScene = activeScenes[sceneId];
      if (!activeScene) return;
      
      // Update UI immediately for responsiveness
      setActiveScenes(prev => {
        const newState = { ...prev };
        delete newState[sceneId];
        return newState;
      });
      
      // Restore each entity to its original state
      for (const entityState of activeScene.originalStates) {
        try {
          const domain = entityState.entityId.split('.')[0];
          
          // Different logic based on entity type
          switch (domain) {
            case 'light':
              // For lights, restore state and attributes
              if (entityState.state === 'on') {
                const lightAttributes: Record<string, any> = {
                  entity_id: entityState.entityId,
                  transition: 1 // 1 second transition
                };
                
                // Only include attributes that existed in the original state
                if (entityState.attributes.brightness !== undefined) {
                  lightAttributes.brightness = entityState.attributes.brightness;
                }
                if (entityState.attributes.color_temp !== undefined) {
                  lightAttributes.color_temp = entityState.attributes.color_temp;
                }
                if (entityState.attributes.rgb_color !== undefined) {
                  lightAttributes.rgb_color = entityState.attributes.rgb_color;
                }
                
                await callService(domain, 'turn_on', lightAttributes);
              } else {
                await callService(domain, 'turn_off', {
                  entity_id: entityState.entityId,
                  transition: 1
                });
              }
              break;
              
            case 'switch':
            case 'input_boolean':
              // For switches, just restore the on/off state
              await callService(domain, entityState.state === 'on' ? 'turn_on' : 'turn_off', {
                entity_id: entityState.entityId
              });
              break;
              
            case 'cover':
              // For covers, restore position
              if (entityState.state === 'open' || entityState.state === 'opening') {
                await callService(domain, 'set_cover_position', {
                  entity_id: entityState.entityId,
                  position: entityState.attributes.current_position
                });
              } else {
                await callService(domain, 'close_cover', {
                  entity_id: entityState.entityId
                });
              }
              break;
              
            default:
              // Default case for other entity types
              if (entityState.state === 'on') {
                await callService(domain, 'turn_on', {
                  entity_id: entityState.entityId
                });
              } else if (entityState.state === 'off') {
                await callService(domain, 'turn_off', {
                  entity_id: entityState.entityId
                });
              }
          }
        } catch (err) {
          console.error(`Failed to restore ${entityState.entityId}:`, err);
        }
      }
    } catch (error) {
      console.error('Failed to deactivate scene:', error);
    }
  };
  
  return (
    <SceneContext.Provider value={{
      activeScenes,
      toggleScene,
      activateScene,
      deactivateScene,
      isSceneActive
    }}>
      {children}
    </SceneContext.Provider>
  );
};