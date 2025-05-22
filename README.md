# Home Assistant Tablet Dashboard

A web-based dashboard application designed for tablets in landscape mode, connecting to Home Assistant's REST API.

## Features

- Optimized for tablet display in landscape mode
- Connect to any Home Assistant instance with a valid access token
- View and control smart home entities
- Clean, modern UI built with React and Emotion
- TypeScript for type safety
- Persistent state management with Zustand
- Scene entity state tracking with local persistence

## Tech Stack

- **React** - Frontend framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router** - Navigation
- **Emotion** - CSS-in-JS styling
- **Zustand** - State management with persistence
- **Jest** - Testing

## Getting Started

### Prerequisites

- Node.js (v14+)
- Home Assistant instance with API access

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser to the URL shown in the terminal

### Building for Production

```bash
npm run build
```

The built application will be in the `dist` directory.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run linting

### Connecting to Home Assistant

You'll need a long-lived access token from your Home Assistant instance:

1. Log in to Home Assistant
2. Go to your profile (click your username in the sidebar)
3. Scroll down to "Long-Lived Access Tokens"
4. Create a token for this app
5. Use this token in the app's login screen

## State Management

The application uses Zustand for state management with local persistence:

### Scene Store

The `sceneStore` maintains the state of active scenes and their original entity states, allowing for:

- Tracking which scenes are active
- Storing original entity states to restore when a scene is deactivated
- Persisting scene states across page reloads

Usage:

```typescript
import { useSceneStore } from '../stores/sceneStore';

// Using the store directly
const { activeScenes, isSceneActive, toggleScene } = useSceneStore();

// Or using the context wrapper
import { useScene } from '../contexts/SceneContextWithZustand';
const { toggleScene, isSceneActive } = useScene();
```

### Entity Store

The `entityStore` provides persistent storage for Home Assistant entities:

- Fast entity lookups by ID
- Filtered entities by domain
- Cached entity states across page reloads

Usage:

```typescript
import { useEntityStore } from '../stores/entityStore';
import { useEntityStoreSync } from '../hooks/useEntityStore';

// Sync entities from Home Assistant
const SyncComponent = () => {
  useEntityStoreSync();
  return null;
};

// Using the store in components
const MyComponent = () => {
  const { getEntity, getEntitiesByDomain } = useEntityStore();
  const lightEntities = getEntitiesByDomain('light');
  const specificEntity = getEntity('light.living_room');
  
  // ...
};
```

## License

MIT