import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import Home from './routes/Home';
import GameRoom from './routes/GameRoom';
import { Outlet } from '@tanstack/react-router';
import { ConfigProvider, theme, Layout } from 'antd';

const { Content } = Layout;

const queryClient = new QueryClient();

// Create a root route
const rootRoute = createRootRoute({
  component: () => (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <Layout style={{ minHeight: '100vh' }}>
        <Content>
          <Outlet />
        </Content>
      </Layout>
    </ConfigProvider>
  ),
});

// Create index route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Home,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'room/$roomId', // Dynamic path
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
