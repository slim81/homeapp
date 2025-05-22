import { ReactNode, useEffect } from 'react';
import styled from '@emotion/styled';

interface DrawerProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  width?: string;
}

interface DrawerContainerProps {
  isOpen: boolean;
  width: string;
}

const DrawerOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
  opacity: ${props => (props.isOpen ? 1 : 0)};
  visibility: ${props => (props.isOpen ? 'visible' : 'hidden')};
  transition: opacity 0.3s ease, visibility 0.3s ease;
`;

const DrawerContainer = styled.div<DrawerContainerProps>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${props => props.width};
  background-color: ${({ theme }) => theme.colors.background};
  box-shadow: ${({ theme }) => theme.shadows.md};
  z-index: 101;
  transform: translateX(${props => (props.isOpen ? '0' : '-100%')});
  transition: transform 0.3s ease;
  overflow-y: auto;
`;

const DrawerHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: ${({ theme }) => theme.spacing.md};
  border-bottom: 1px solid #eee;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const DrawerContent = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
`;

export const Drawer = ({ children, isOpen, onClose, width = '280px' }: DrawerProps) => {
  // Prevent body scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      <DrawerOverlay isOpen={isOpen} onClick={onClose} />
      <DrawerContainer isOpen={isOpen} width={width}>
        <DrawerHeader>
          <CloseButton onClick={onClose}>×</CloseButton>
        </DrawerHeader>
        <DrawerContent>
          {children}
        </DrawerContent>
      </DrawerContainer>
    </>
  );
};