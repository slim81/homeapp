# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important Rules for Claude

1. **Always use Playwright for UI troubleshooting**
   - When addressing UI issues, always use Playwright MCP to observe and understand the problem
   - Use Playwright to visually inspect elements, track state changes, and verify fixes
   - This is crucial for properly diagnosing complex UI interactions and behavior

2. **Development Server Rules**
   - DO NOT attempt to run the development server
   - The development server will be run in a separate terminal by the user
   - Ask if the server is running before attempting to test with Playwright
   - Connect to localhost:3000 for testing

3. **Menu Interaction**
   - When clicking something in the menu, make sure the menu is open before triggering the click

4. **Always use Sequential Thinking MCP**
   - Apply sequential thinking methodology when analyzing and solving problems
   - Break down complex tasks into step-by-step logical sequences
   - Ensure a methodical and comprehensive approach to coding and debugging

5. **Always use Playwright MCP to verify code changes**
   - Use Playwright MCP to verify and validate all code changes
   - Ensure comprehensive testing of modifications before finalizing

## Project Overview

This is a Home Assistant Tablet Dashboard - a web-based dashboard application designed for tablets in landscape mode, connecting to Home Assistant's REST API. It allows users to connect to a Home Assistant instance, view and control smart home entities through a clean, modern UI.

## Commands

### Development

- `npm run dev` - Start the development server with Vite (NOTE: DO NOT run this command, user will handle it)
- `npm run build` - Build for production (runs TypeScript build and Vite build)
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to lint all code

### Playwright

- Use Playwright MCP commands for UI testing and debugging
- Test on the running development server at localhost:3000
- Verify UI fixes by observing real behavior with Playwright
- Document UI issues with screenshots when necessary

### Testing

- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm test -- -t "test name"` - Run a specific test by name

## Architecture

### Core Components

1. **API Integration Layer**
   - Located in `src/api/homeAssistant.ts`
   - Provides a clean interface to the Home Assistant REST API
   - Handles authentication, entity state fetching, and service calls

2. **Context System**
   - `src/contexts/HomeAssistantContext.tsx` - Core connection and state management
   - Manages connection state, entity data, and service calls
   - Provides authentication and persistent connections via local storage

3. **Component Architecture**
   - Uses styled components with Emotion
   - Theming system in `src/theme/`
   - Reusable UI components in `src/components/ui/`

4. **Routing and Pages**
   - Uses React Router for navigation
   - Main pages: Login and Dashboard
   - Protected routes pattern to ensure authenticated access

### Data Flow

1. User logs in with Home Assistant URL and Access Token
2. HomeAssistantContext connects to the API and stores credentials
3. API fetches entities and services
4. Dashboard displays entities grouped by domain
5. Context refreshes entities every 30 seconds
6. Service calls update entity states in real-time

### State Management

- React Context API for global state
- Local storage for persisting connection details
- No external state management libraries

## Authentication

The application uses Home Assistant long-lived access tokens:
1. User provides a Home Assistant server URL
2. User provides a Long-Lived Access Token created in their Home Assistant instance
3. Credentials are stored in local storage for persistent connection

## Security Notes

The application stores the Home Assistant access token in local storage, which is a security trade-off for convenience. This allows automatic reconnection when the app is reloaded but means the token is stored in the browser.