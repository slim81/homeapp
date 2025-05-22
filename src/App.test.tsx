import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the react-router-dom components we need
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: () => <div />,
  Navigate: () => <div />,
  Outlet: () => <div />,
  useNavigate: () => jest.fn(),
}));

// Mock our context to avoid initialization issues in tests
jest.mock('./contexts/HomeAssistantContext', () => ({
  useHomeAssistant: () => ({
    isConnected: false,
    connect: jest.fn(),
    disconnect: jest.fn(),
    error: null,
  }),
  HomeAssistantProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });
});