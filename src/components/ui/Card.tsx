import styled from '@emotion/styled';
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  fullWidth?: boolean;
  onClick?: () => void;
  className?: string;
}

const CardContainer = styled.div<Pick<CardProps, 'fullWidth' | 'onClick'>>`
  background-color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  padding: ${({ theme }) => theme.spacing.lg};
  transition: transform ${({ theme }) => theme.transitions.short}, 
              box-shadow ${({ theme }) => theme.transitions.short};
  
  ${({ fullWidth }) => fullWidth ? 'width: 100%;' : ''}
  ${({ onClick, theme }) => onClick ? `
    cursor: pointer;
    &:hover {
      transform: translateY(-5px);
      box-shadow: ${theme.shadows.md};
    }
  ` : ''}
`;

const CardTitle = styled.h2`
  margin-top: 0;
  margin-bottom: ${({ theme }) => theme.spacing.md};
  font-size: ${({ theme }) => theme.fontSizes.lg};
  color: ${({ theme }) => theme.colors.text};
`;

const CardContent = styled.div`
  color: ${({ theme }) => theme.colors.text};
`;

export const Card = ({ 
  children, 
  title, 
  fullWidth = false, 
  onClick, 
  className 
}: CardProps) => {
  return (
    <CardContainer 
      fullWidth={fullWidth} 
      onClick={onClick} 
      className={className}
    >
      {title && <CardTitle>{title}</CardTitle>}
      <CardContent>{children}</CardContent>
    </CardContainer>
  );
};