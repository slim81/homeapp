import { useState, useEffect, useCallback, useRef } from 'react';
import styled from '@emotion/styled';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';
import { debounce } from '../utils/debounce';
import type { Entity } from '../api/types';

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

const LightCard = styled.div<{ isOn: boolean }>`
  background-color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all ${({ theme }) => theme.transitions.short};
  border-left: 5px solid ${({ isOn, theme }) => 
    isOn ? theme.colors.primary : theme.colors.lightText};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`;

const LightName = styled.h3`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const LightStatus = styled.div<{ isOn: boolean }>`
  display: flex;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  
  &::before {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: ${({ isOn, theme }) => 
      isOn ? theme.colors.success : theme.colors.lightText};
    margin-right: ${({ theme }) => theme.spacing.sm};
  }
`;

const ToggleButton = styled.button<{ isOn: boolean }>`
  background-color: ${({ isOn, theme }) => 
    isOn ? theme.colors.primary : theme.colors.background};
  color: ${({ isOn }) => isOn ? 'white' : 'inherit'};
  border: 1px solid ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  padding: ${({ theme }) => `${theme.spacing.sm} ${theme.spacing.md}`};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.short};
  width: 100%;
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary}99;
    color: white;
  }
  
  &:disabled {
    background-color: ${({ theme }) => theme.colors.lightText};
    color: white;
    cursor: not-allowed;
    opacity: 0.7;
    border-color: ${({ theme }) => theme.colors.lightText};
  }
`;

const BrightnessSlider = styled.input`
  width: 100%;
  margin-top: ${({ theme }) => theme.spacing.md};
`;

export const Lights = () => {
  const { entities, callService, refreshEntities } = useHomeAssistant();
  const [isLoading, setIsLoading] = useState(true);
  const [lightStates, setLightStates] = useState<Record<string, boolean>>({});
  // Keep track of local brightness values for smoother UX
  const [localBrightness, setLocalBrightness] = useState<Record<string, number>>({});
  
  // Create a memoized debounced function for brightness changes
  // The ref ensures we keep the same function instance between renders
  const debouncedCallServiceRef = useRef<Record<string, (brightness: number) => void>>({});
  
  // Filter only light entities
  const lightEntities = entities.filter(entity => 
    entity.entity_id.startsWith('light.')
  );

  useEffect(() => {
    if (entities.length > 0) {
      setIsLoading(false);
      
      // Create new objects instead of updating incrementally
      const newLightStates: Record<string, boolean> = {};
      const newBrightnessState: Record<string, number> = {};
      
      // Process all light entities at once
      lightEntities.forEach(light => {
        // Set the light state directly
        newLightStates[light.entity_id] = light.state === 'on';
        
        // Store brightness if light is on and has brightness attribute
        if (light.attributes.brightness !== undefined) {
          newBrightnessState[light.entity_id] = Math.round(light.attributes.brightness / 2.55);
        } else if (light.state === 'on' && newBrightnessState[light.entity_id] === undefined) {
          // Default brightness for on lights with no brightness setting
          newBrightnessState[light.entity_id] = 100;
        }
      });
      
      // Replace state objects completely
      setLightStates(newLightStates);
      
      // Update brightness state, preserving values for entities not in the update
      setLocalBrightness(prev => {
        const combined = {...prev};
        Object.entries(newBrightnessState).forEach(([entityId, brightness]) => {
          combined[entityId] = brightness;
        });
        return combined;
      });
    }
  }, [entities]);

  // This state is separate from lightStates but specifically tracks the transient state of pending toggle operations
  const [pendingToggles, setPendingToggles] = useState<Record<string, boolean>>({});

  // Handles toggling a light on/off with simple, direct approach
  const handleToggleLight = async (entityId: string, isOn: boolean) => {
    const targetState = !isOn;
    
    // 1. Set button to "Processing" state
    setPendingToggles(prev => ({...prev, [entityId]: true}));
    
    try {
      // 2. Call service to toggle light
      if (targetState) {
        // Turn light on (with brightness if available)
        const brightness = localBrightness[entityId] ? Math.round(localBrightness[entityId] * 2.55) : undefined;
        await callService('light', 'turn_on', { 
          entity_id: entityId,
          ...(brightness && { brightness })
        });
      } else {
        // Turn light off
        await callService('light', 'turn_off', { entity_id: entityId });
      }
      
      // 3. Manually set UI state based on successful action
      setLightStates(prev => ({...prev, [entityId]: targetState}));
    } catch (error) {
      console.error('Failed to toggle light:', error);
      // Don't change UI state on failure
    } finally {
      // 4. Clear pending state in any case
      setPendingToggles(prev => {
        const updated = {...prev};
        delete updated[entityId];
        return updated;
      });
    }
  };

  // Create debounced function for each light entity
  const getDebouncedBrightnessHandler = useCallback((entityId: string) => {
    if (!debouncedCallServiceRef.current[entityId]) {
      debouncedCallServiceRef.current[entityId] = debounce(async (brightness: number) => {
        try {
          // 1. Call API to set brightness
          await callService('light', 'turn_on', {
            entity_id: entityId,
            brightness: Math.round(brightness * 2.55) // Convert 0-100 to 0-255
          });
          
          // 2. Make sure the light is shown as on in our UI too
          setLightStates(prev => ({
            ...prev,
            [entityId]: true // Ensure light shows as on when adjusting brightness
          }));
        } catch (error) {
          console.error('Failed to change brightness:', error);
          // No need to revert UI state since the slider is user-controlled
        }
      }, 300); // 300ms debounce time
    }
    return debouncedCallServiceRef.current[entityId];
  }, [callService, refreshEntities]);

  // Handle brightness change
  const handleBrightnessChange = (entityId: string, brightness: number) => {
    // Update local state immediately for responsive UI
    setLocalBrightness(prev => ({
      ...prev,
      [entityId]: brightness
    }));
    
    // Make sure the light appears turned on in the UI
    setLightStates(prev => ({
      ...prev,
      [entityId]: true
    }));
    
    // Debounce the actual API call
    getDebouncedBrightnessHandler(entityId)(brightness);
  };


  return (
    <Content>
      {isLoading && <p>Loading lights...</p>}
      
      {!isLoading && lightEntities.length === 0 && (
        <p>No lights found. Make sure your Home Assistant has light entities configured.</p>
      )}
      
      {!isLoading && lightEntities.length > 0 && (
        <Grid>
          {lightEntities.map(light => {
            const entityId = light.entity_id;
            // Use the stored state if available, otherwise use entity state
            const isOn = lightStates[entityId] !== undefined ? 
              lightStates[entityId] : 
              light.state === 'on';
            
            const brightness = light.attributes.brightness;
            const brightnessPercent = brightness ? Math.round(brightness / 2.55) : 0; // Convert 0-255 to 0-100
            
            // Check if this light supports dimming
            // There are two ways to determine this:
            // 1. Using supported_features bitmask (brightness is bit 1 or 2^0)
            // 2. Or checking if the light has supported_color_modes that allow brightness
            const hasBrightnessFeature = !!(light.attributes.supported_features & 1);
            const hasBrightnessColorModes = Array.isArray(light.attributes.supported_color_modes) && 
                light.attributes.supported_color_modes.some(mode => 
                    ['brightness', 'hs', 'xy', 'rgb', 'rgbw', 'rgbww', 'color_temp'].includes(mode)
                );
            
            const supportsBrightness = hasBrightnessFeature || hasBrightnessColorModes;
            
            return (
              <LightCard key={entityId} isOn={isOn}>
                <LightName>
                  {light.attributes.friendly_name || entityId.replace('light.', '')}
                </LightName>
                
                <LightStatus isOn={isOn}>
                  {isOn ? 'On' : 'Off'}
                </LightStatus>
                
                <ToggleButton 
                  isOn={isOn}
                  onClick={() => {
                    // Only toggle if there's no pending action already
                    if (!pendingToggles[entityId]) {
                      handleToggleLight(entityId, isOn)
                    }
                  }}
                  disabled={pendingToggles[entityId]}
                >
                  {pendingToggles[entityId] ? 'Processing...' : (isOn ? 'Turn Off' : 'Turn On')}
                </ToggleButton>
                
                {/* Only display the brightness slider if the light supports brightness control */}
                {supportsBrightness ? (
                  <div style={{ height: '30px', marginTop: '16px', overflow: 'hidden' }}>
                    <BrightnessSlider 
                      type="range"
                      min="0"
                      max="100"
                      style={{ 
                        opacity: isOn ? '1' : '0',
                        pointerEvents: isOn ? 'auto' : 'none',
                        transition: 'opacity 0.3s ease'
                      }}
                      value={localBrightness[entityId] ?? brightnessPercent}
                      onChange={(e) => handleBrightnessChange(entityId, parseInt(e.target.value))}
                    />
                  </div>
                ) : null}
              </LightCard>
            );
          })}
        </Grid>
      )}
    </Content>
  );
};