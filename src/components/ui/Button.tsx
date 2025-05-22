import styled from '@emotion/styled';
import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

const StyledButton = styled.button<Omit<ButtonProps, 'children'>>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-weight: 500;
  transition: all ${({ theme }) => theme.transitions.short};
  cursor: pointer;
  
  ${({ variant, theme }) => {
    switch (variant) {
      case 'secondary':
        return `
          background-color: ${theme.colors.secondary};
          color: white;
          border: none;
          
          &:hover:not(:disabled) {
            background-color: ${theme.colors.secondary}dd;
          }
        `;
      case 'text':
        return `
          background-color: transparent;
          color: ${theme.colors.primary};
          border: none;
          
          &:hover:not(:disabled) {
            background-color: rgba(0, 0, 0, 0.05);
          }
        `;
      default: // 'primary'
        return `
          background-color: ${theme.colors.primary};
          color: white;
          border: none;
          
          &:hover:not(:disabled) {
            background-color: ${theme.colors.primary}dd;
          }
        `;
    }
  }}
  
  ${({ size, theme }) => {
    switch (size) {
      case 'small':
        return `
          font-size: ${theme.fontSizes.xs};
          padding: ${theme.spacing.xs} ${theme.spacing.md};
        `;
      case 'large':
        return `
          font-size: ${theme.fontSizes.lg};
          padding: ${theme.spacing.md} ${theme.spacing.xl};
        `;
      default: // 'medium'
        return `
          font-size: ${theme.fontSizes.md};
          padding: ${theme.spacing.sm} ${theme.spacing.lg};
        `;
    }
  }}
  
  ${({ fullWidth }) => fullWidth && 'width: 100%;'}
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

export const Button = ({ 
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  ...props 
}: ButtonProps) => {
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      {...props}
    >
      {children}
    </StyledButton>
  );
};