import { createBrowserRouter } from 'react-router';
import { AuthProvider } from './providers/auth-provider/AuthProvider';
import { ThemeProvider } from './providers/theme/ThemeProvider';
import { RouterProvider } from 'react-router/dom';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { AuthLayout } from './features/auth/layouts/AuthLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { SignupPage } from './features/auth/pages/SignupPage';
import { createSupabaseAuthService } from './features/auth/api/supabaseAuthService';
import { supabaseClient } from './lib/supabase';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorPage } from './pages/ErrorPage';
import { DesignSystem } from './DesignSystem';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { SalesPage } from './features/sales/pages/SalesPage';
import { InventoryPage } from './features/inventory/pages/InventoryPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'sales', element: <SalesPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'signup',
        element: <SignupPage />,
      },
    ],
  },
  ...(import.meta.env.DEV ? [{ path: '/design-system', element: <DesignSystem /> }] : []),
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

const supabaseAuthService = createSupabaseAuthService(supabaseClient);

export default function App() {
  return (
    <AuthProvider authService={supabaseAuthService}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </AuthProvider>
  );
}
