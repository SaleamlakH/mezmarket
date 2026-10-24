import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router/dom';
import { router } from './router';
import { AuthProvider } from './providers/auth-provider/AuthProvider';
import { BusinessProvider } from './providers/business/BusinessProvider';
import { CatalogProvider } from './providers/catalog/CatalogProvider';
import { CustomersProvider } from './providers/customers/CustomersProvider';
import { MembersProvider } from './providers/members/MembersProvider';
import { ThemeProvider } from './providers/theme/ThemeProvider';
import { useAuthContext } from './providers/auth-provider/useAuthContext';
import { createSupabaseAuthService } from './features/auth/api/supabaseAuthService';
import { supabaseClient } from './lib/supabase';
import { businessService } from './features/business/api/businessService';
import { productsService } from './features/products/api/productsService';
import { customersService } from './features/customers/api/customersService';
import { membersService } from './features/members/api/membersService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
    },
  },
});

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
          <CustomersProvider customersService={customersService}>
            <MembersProvider membersService={membersService}>
              <AppProviders>
                <ThemeProvider>
                  <RouterProvider router={router} />
                </ThemeProvider>
              </AppProviders>
            </MembersProvider>
          </CustomersProvider>
        </CatalogProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
