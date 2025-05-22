import { ReactNode, useState, useCallback } from 'react';
import styled from '@emotion/styled';
import { Outlet, useLocation } from 'react-router-dom';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';
import { Drawer } from '../components/ui/Drawer';
import { AppHeader } from '../components/AppHeader';
import { AppMenu } from '../components/AppMenu';

const LayoutContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Main = styled.main`
  flex: 1;
  position: relative;
`;

// Force landscape orientation styling
const LandscapeContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;

  @media (orientation: portrait) {
    &::before {
      content: 'Please rotate your device to landscape mode';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${({ theme }) => theme.colors.background};
      color: ${({ theme }) => theme.colors.text};
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      font-size: ${({ theme }) => theme.fontSizes.xl};
      padding: ${({ theme }) => theme.spacing.xl};
      text-align: center;
    }
  }
`;

const ContentContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
`;

interface MainLayoutProps {
  children?: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  const { isConnected } = useHomeAssistant();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();
  
  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen(prevState => !prevState);
  }, []);
  
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);
  
  // Get the title from the current route
  const getTitle = () => {
    const path = location.pathname;
    if (path.includes('dashboard')) return 'Dashboard';
    if (path.includes('lights')) return 'Lights';
    if (path.includes('scenes')) return 'Scenes';
    if (path.includes('music')) return 'Music';
    if (path.includes('favorites')) return 'Favorites';
    if (path.includes('rooms')) return 'Rooms';
    if (path.includes('devices')) return 'Devices';
    if (path.includes('automations')) return 'Automations';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('login')) return 'Connect to Home Assistant';
    return 'Home Assistant Dashboard';
  };

  // If not connected to Home Assistant and not on the login page,
  // don't show the drawer or header
  if (!isConnected && location.pathname !== '/login') {
    return (
      <LayoutContainer>
        <Main>
          {children || <Outlet />}
        </Main>
      </LayoutContainer>
    );
  }

  // On the login page, don't show the header or drawer
  if (location.pathname === '/login') {
    return (
      <LayoutContainer>
        <Main>
          {children || <Outlet />}
        </Main>
      </LayoutContainer>
    );
  }

  return (
    <LayoutContainer>
      <Drawer isOpen={isDrawerOpen} onClose={closeDrawer}>
        <AppMenu onClose={closeDrawer} />
      </Drawer>
      
      <Main>
        <LandscapeContainer>
          <ContentContainer>
            <AppHeader 
              onMenuToggle={toggleDrawer} 
              title={getTitle()} 
            />
            {children || <Outlet />}
          </ContentContainer>
        </LandscapeContainer>
      </Main>
    </LayoutContainer>
  );
};