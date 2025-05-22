import React from 'react';
import { Icon as MDIcon } from '@mdi/react';
import * as icons from '@mdi/js';
import styled from '@emotion/styled';

interface IconContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

const IconContainer = styled.div<IconContainerProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: ${({ size, theme }) => {
      switch (size) {
        case 'sm': return '16px';
        case 'md': return '24px';
        case 'lg': return '32px';
        case 'xl': return '48px';
        default: return '24px';
      }
    }};
    height: ${({ size, theme }) => {
      switch (size) {
        case 'sm': return '16px';
        case 'md': return '24px';
        case 'lg': return '32px';
        case 'xl': return '48px';
        default: return '24px';
      }
    }};
  }
`;

interface IconProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, size = 'md', color, className }) => {
  // Transform mdi:icon-name to mdiIconName format (for @mdi/js imports)
  const formattedName = name.replace(/^mdi:/i, '');
  const iconKey = formattedName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  const pascalCase = iconKey.charAt(0).toUpperCase() + iconKey.slice(1);
  const iconName = `mdi${pascalCase}`;
  
  // Check if the icon exists in the icons object
  if (!(iconName in icons)) {
    console.warn(`Icon ${name} (${iconName}) not found in @mdi/js package`);
    return <IconContainer size={size} color={color} className={className}>❓</IconContainer>;
  }
  
  return (
    <IconContainer size={size} color={color} className={className}>
      <MDIcon 
        path={icons[iconName as keyof typeof icons]} 
        color={color}
        title={name}
      />
    </IconContainer>
  );
};