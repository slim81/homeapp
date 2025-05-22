import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { useHomeAssistant } from '../contexts/HomeAssistantContext';
import { ApiType } from '../api/homeAssistantApi';

const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: ${({ theme }) => theme.spacing.xl};
  background-color: ${({ theme }) => theme.colors.background};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  padding: ${({ theme }) => theme.spacing.xl};
  background-color: white;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  box-shadow: ${({ theme }) => theme.shadows.md};
`;

const Title = styled.h1`
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.primary};
`;

const FormGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
  color: ${({ theme }) => theme.colors.text};
`;

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing.md};
  border: 1px solid #ddd;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.md};
  
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Button = styled.button`
  padding: ${({ theme }) => theme.spacing.md};
  background-color: ${({ theme }) => theme.colors.primary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  font-size: ${({ theme }) => theme.fontSizes.md};
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.transitions.short};
  
  &:hover {
    background-color: ${({ theme }) => theme.colors.primary}dd;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: ${({ theme }) => theme.colors.error};
  margin-top: ${({ theme }) => theme.spacing.md};
  text-align: center;
`;

export const Login = () => {
  const [baseUrl, setBaseUrl] = useState('http://192.168.10.5:8123');
  const [accessToken, setAccessToken] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiI1ZWZkZjE4YTBjMDE0MGVkYjhlZWRjOGM3MDQ0ZWYwNCIsImlhdCI6MTc0NzQ5NTg3OCwiZXhwIjoyMDYyODU1ODc4fQ.t27hkcJFmNdO0NLhG-l3cAq26CkdDX99hzVU_lRLoh0');
  const [apiType, setApiType] = useState<ApiType>(ApiType.WEBSOCKET);
  const { connect, error, isConnecting } = useHomeAssistant();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await connect(baseUrl.trim(), accessToken.trim(), apiType);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the context
    }
  };

  return (
    <LoginContainer>
      <Form onSubmit={handleSubmit}>
        <Title>Connect to Home Assistant</Title>
        
        <FormGroup>
          <Label htmlFor="baseUrl">Home Assistant URL</Label>
          <Input
            id="baseUrl"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://localhost:8123"
            required
          />
        </FormGroup>
        
        <FormGroup>
          <Label htmlFor="accessToken">Access Token</Label>
          <Input
            id="accessToken"
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Your Long-Lived Access Token"
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="apiType">Connection Type</Label>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="apiType"
                value={ApiType.REST}
                checked={apiType === ApiType.REST}
                onChange={() => setApiType(ApiType.REST)}
                style={{ marginRight: '5px' }}
              />
              REST API (Polling)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="apiType"
                value={ApiType.WEBSOCKET}
                checked={apiType === ApiType.WEBSOCKET}
                onChange={() => setApiType(ApiType.WEBSOCKET)}
                style={{ marginRight: '5px' }}
              />
              WebSocket API (Real-time)
            </label>
          </div>
        </FormGroup>
        
        <Button type="submit" disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Form>
    </LoginContainer>
  );
};