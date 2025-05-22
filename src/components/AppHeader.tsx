import styled from '@emotion/styled';
import { HamburgerIcon } from './ui/HamburgerIcon';

interface AppHeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => `${theme.spacing.md} ${theme.spacing.lg}`};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.xl};
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
`;

export const AppHeader = ({ onMenuToggle, title = 'Home Assistant Dashboard' }: AppHeaderProps) => {
  return (
    <HeaderContainer>
      <LeftSection>
        <HamburgerIcon onClick={onMenuToggle} />
        <Title>{title}</Title>
      </LeftSection>
      <RightSection>
        <div>Tablet Mode</div>
      </RightSection>
    </HeaderContainer>
  );
};