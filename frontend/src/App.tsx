import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createRouter,
  createRoute,
  createRootRoute,
  Outlet,
} from '@tanstack/react-router';
import { useState } from 'react';
import Home from './routes/Home';
import GameRoom from './routes/GameRoom';
import { ConfigProvider, theme } from 'antd';
import { DynamicBackground } from './components/backgrounds/DynamicBackground';
import { CreditsModal } from './components/CreditsModal';
import { useBackendVersion } from './api/client';

const queryClient = new QueryClient();

// Custom Ant Design theme for Werewolf game
const werewolfTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#9370db',
    colorBgBase: '#1a1128',
    colorBgContainer: 'rgba(0, 0, 0, 0.3)',
    colorBgElevated: '#2d1f47',
    colorBorder: 'rgba(147, 112, 219, 0.3)',
    colorBorderSecondary: 'rgba(147, 112, 219, 0.2)',
    colorText: '#f0e6ff',
    colorTextSecondary: '#a89cc8',
    colorTextTertiary: '#8a7aa8',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  components: {
    Card: {
      headerBg: 'transparent',
      colorBgContainer: 'rgba(0, 0, 0, 0.3)',
    },
    Button: {
      primaryColor: '#ffffff',
    },
    Input: {
      colorBgContainer: 'rgba(255, 255, 255, 0.1)',
    },
    Select: {
      colorBgContainer: 'rgba(255, 255, 255, 0.1)',
    },
    InputNumber: {
      colorBgContainer: 'rgba(255, 255, 255, 0.1)',
    },
    Layout: {
      bodyBg: 'transparent',
      headerBg: 'transparent',
    },
  },
};

function RootComponent() {
  const [showCredits, setShowCredits] = useState(false);

  const { data: backendVersion } = useBackendVersion();

  return (
    <ConfigProvider theme={werewolfTheme}>
      <div
        style={{
          height: '100vh',
          background: 'linear-gradient(135deg, #1a1128 0%, #2d1f47 100%)',
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <DynamicBackground />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Outlet />
        </div>
        {/* Credits Footer */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
            padding: '16px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            fontSize: 12,
            color: 'rgba(168, 156, 200, 0.4)',
            fontFamily: 'monospace',
          }}
        >
          <button
            onClick={() => setShowCredits(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(168, 156, 200, 0.6)',
              fontSize: 12,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'inherit',
              padding: 0,
            }}
          >
            Credits
          </button>

          <span>|</span>

          <span>
            FE: {__APP_VERSION__} ({__COMMIT_HASH__})
          </span>
          <span>|</span>
          <span>
            BE: {backendVersion?.version || '?'} ({backendVersion?.commit_sha || '?'})
          </span>
        </div>
        <CreditsModal open={showCredits} onClose={() => setShowCredits(false)} />
      </div>
    </ConfigProvider>
  );
}

// Create a root route
const rootRoute = createRootRoute({
  component: RootComponent,
});

// Create index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'room/$roomId',
  component: GameRoom,
});

// Create the router
const routeTree = rootRoute.addChildren([indexRoute, roomRoute]);
const router = createRouter({ routeTree });

// Register things for typesafety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
