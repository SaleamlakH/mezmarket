import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate } from 'react-router';
import { AuthProvider } from './providers/auth-provider/AuthProvider';
import { BusinessProvider } from './providers/business/BusinessProvider';
import { CatalogProvider } from './providers/catalog/CatalogProvider';
import { ThemeProvider } from './providers/theme/ThemeProvider';
import { useAuthContext } from './providers/auth-provider/useAuthContext';
import { RouterProvider } from 'react-router/dom';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { BusinessGate } from './layouts/BusinessGate';
import { RegistrationLayout } from './layouts/RegistrationLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { SignupPage } from './features/auth/pages/SignupPage';
import { createSupabaseAuthService } from './features/auth/api/supabaseAuthService';
import { supabaseClient } from './lib/supabase';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorPage } from './pages/ErrorPage';
import { DesignSystem } from './DesignSystem';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './features/dashboard/pages/DashboardPage';
import { ProductsPage } from './features/products/pages/ProductsPage';
import { SalesPage } from './features/sales/pages/SalesPage';
import { InventoryPage } from './features/inventory/pages/InventoryPage';
import { BatchesPage } from './features/inventory/pages/BatchesPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { BusinessProfilePage } from './features/business/pages/BusinessProfilePage';
import { businessService } from './features/business/api/businessService';
import { productsService } from './features/products/api/productsService';
import { CreateBusinessPage } from './features/business/pages/CreateBusinessPage';
import { OwnerProfilePage } from './features/owner-profile/pages/OwnerProfilePage';
import { ownerApi } from './features/owner-profile/api/ownerApi';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <BusinessGate />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'products', element: <ProductsPage /> },
              { path: 'sales', element: <SalesPage /> },
              { path: 'inventory', element: <InventoryPage /> },
              { path: 'inventory/batches', element: <BatchesPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'settings/profile', element: <OwnerProfilePage ownerApi={ownerApi} /> },
              { path: 'settings/business', element: <BusinessProfilePage /> },
            ],
          },
        ],
      },
      {
        path: 'businesses/new',
        element: <RegistrationLayout />,
        children: [
          {
            index: true,
            element: <CreateBusinessPage />,
          },
        ],
      },
    ],
  },
  {
    element: <RegistrationLayout />,
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

function AppProviders({ children }: { children: React.ReactNode }) {
  const {
    session: { user },
  } = useAuthContext();
  return (
    <BusinessProvider userId={user?.id ?? null} businessService={businessService}>
      {children}
    </BusinessProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider authService={supabaseAuthService}>
        <CatalogProvider catalogService={productsService}>
          <AppProviders>
            <ThemeProvider>
              <RouterProvider router={router} />
            </ThemeProvider>
          </AppProviders>
        </CatalogProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
