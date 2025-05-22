import React from 'react';
import styled from '@emotion/styled';
import { Icon } from './ui/Icon';
import { Entity } from '../api/types';

interface SceneCardProps {
  scene: Entity;
  active: boolean;
  onClick: () => void;
  className?: string;
}

const CardContainer = styled.div<{ active: boolean }>`
  background-color: ${({ active, theme }) => active ? `${theme.colors.primary}15` : 'white'};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: all ${({ theme }) => theme.transitions.short};
  cursor: pointer;
  border-left: 5px solid ${({ active, theme }) => 
    active ? theme.colors.success : theme.colors.primary};
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: ${({ theme }) => theme.shadows.md};
    background-color: ${({ active, theme }) => 
      active ? `${theme.colors.success}20` : theme.colors.background};
  }
  
  &:active {
    transform: translateY(0);
    background-color: ${({ theme }) => theme.colors.primary}20;
  }
`;

const IconWrapper = styled.div`
  margin-right: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.primary};
`;

const ContentWrapper = styled.div`
  flex: 1;
`;

const SceneName = styled.h3`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const SceneInfo = styled.div`
  color: ${({ theme }) => theme.colors.lightText};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const ActiveIndicator = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.success};
`;

export const SceneCard: React.FC<SceneCardProps> = ({ scene, active, onClick, className }) => {
  const friendlyName = scene.attributes.friendly_name || scene.entity_id.replace('scene.', '');
  const iconName = scene.attributes.icon || 'mdi:home-automation'; // Default icon if none specified
  const entitiesCount = scene.attributes.entities ? Object.keys(scene.attributes.entities).length : 0;

  return (
    <CardContainer 
      active={active} 
      onClick={onClick} 
      className={className}
    >
      {active && <ActiveIndicator />}
      
      <IconWrapper>
        <Icon name={iconName} size="lg" />
      </IconWrapper>
      
      <ContentWrapper>
        <SceneName>{friendlyName}</SceneName>
        
        {scene.attributes.entities && (
          <SceneInfo>
            {entitiesCount} entities • {active ? 'Active' : 'Inactive'}
          </SceneInfo>
        )}
      </ContentWrapper>
    </CardContainer>
  );
};