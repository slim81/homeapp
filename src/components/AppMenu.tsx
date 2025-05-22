import { Link } from 'react-router-dom';
import styled from '@emotion/styled';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';

const MenuContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const MenuHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
`;

const MenuTitle = styled.h2`
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const MenuSubtitle = styled.p`
  color: ${({ theme }) => theme.colors.lightText};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const MenuItem = styled.li`
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const MenuLink = styled(Link)`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: background-color ${({ theme }) => theme.transitions.short};
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
  
  &.active {
    background-color: ${({ theme }) => theme.colors.primary + '20'};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const MenuButton = styled.button`
  display: flex;
  align-items: center;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  font-weight: 500;
  background: none;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.short};
  text-align: left;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
`;

interface AppMenuProps {
  onClose: () => void;
}

export const AppMenu = ({ onClose }: AppMenuProps) => {
  const { disconnect, isConnected } = useHomeAssistant();
  
  const handleLogout = () => {
    disconnect();
    onClose();
  };
  
  return (
    <MenuContainer>
      <MenuHeader>
        <MenuTitle>Home Assistant</MenuTitle>
        <MenuSubtitle>Tablet Dashboard</MenuSubtitle>
      </MenuHeader>
      
      <MenuList>
        <MenuItem>
          <MenuLink to="/dashboard" onClick={onClose}>Dashboard</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/lights" onClick={onClose}>Lights</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/scenes" onClick={onClose}>Scenes</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/music" onClick={onClose}>Music</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/favorites" onClick={onClose}>Favorites</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/rooms" onClick={onClose}>Rooms</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/devices" onClick={onClose}>Devices</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/automations" onClick={onClose}>Automations</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/settings" onClick={onClose}>Settings</MenuLink>
        </MenuItem>
        <MenuItem>
          <MenuLink to="/developer" onClick={onClose}>Developer</MenuLink>
        </MenuItem>
        {isConnected && (
          <MenuItem>
            <MenuButton onClick={handleLogout}>Logout</MenuButton>
          </MenuItem>
        )}
      </MenuList>
    </MenuContainer>
  );
};