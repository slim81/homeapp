import styled from '@emotion/styled';

interface HamburgerIconProps {
  onClick: () => void;
  size?: string;
  color?: string;
}

const Button = styled.button<{ size: string }>`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: ${props => props.size};
  height: ${props => props.size};
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
`;

const Line = styled.span<{ color: string }>`
  width: 100%;
  height: 3px;
  background-color: ${props => props.color};
  border-radius: 3px;
  transition: all 0.3s ease;
  
  &:nth-of-type(2) {
    margin: 3px 0;
  }
`;

export const HamburgerIcon = ({ 
  onClick, 
  size = '24px', 
  color = 'white' 
}: HamburgerIconProps) => {
  return (
    <Button onClick={onClick} size={size}>
      <Line color={color} />
      <Line color={color} />
      <Line color={color} />
    </Button>
  );
};