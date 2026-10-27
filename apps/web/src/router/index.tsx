import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from '@/layouts/ProtectedRoute';
import { BusinessGate } from '@/layouts/BusinessGate';
import { RegistrationLayout } from '@/layouts/RegistrationLayout';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPeriodProvider } from '@/features/dashboard/context/DashboardPeriodProvider';
import { SaleDraftProvider } from '@/features/sales/state/SaleDraftProvider';
import { InventoryFilterProvider } from '@/features/inventory/context/InventoryFilterProvider';
import {
  AllSalesPage,
  BatchDetailPage,
  BatchesPage,
  BusinessProfilePage,
  CreateBusinessPage,
  DashboardPage,
  DesignSystemPage,
  ErrorPage,
  InventoryPage,
  LoginPage,
  NotFoundPage,
  OwnerProfilePage,
  ProductDetailPage,
  ProductInventoryDetailPage,
  ProductsPage,
  SaleDetailPage,
  SaleDock,
  SalesPage,
  SettingsPage,
  SignupPage,
  VerifyEmailPage,
} from './lazy-pages';
import { withSuspense } from './withSuspense';

const SuspendedLoginPage = withSuspense(LoginPage);
const SuspendedSignupPage = withSuspense(SignupPage);
const SuspendedVerifyEmailPage = withSuspense(VerifyEmailPage);
const SuspendedDashboardPage = withSuspense(DashboardPage);
const SuspendedProductsPage = withSuspense(ProductsPage);
const SuspendedProductDetailPage = withSuspense(ProductDetailPage);
const SuspendedSalesPage = withSuspense(SalesPage);
const SuspendedAllSalesPage = withSuspense(AllSalesPage);
const SuspendedSaleDetailPage = withSuspense(SaleDetailPage);
const SuspendedInventoryPage = withSuspense(InventoryPage);
const SuspendedBatchesPage = withSuspense(BatchesPage);
const SuspendedBatchDetailPage = withSuspense(BatchDetailPage);
const SuspendedProductInventoryDetailPage = withSuspense(ProductInventoryDetailPage);
const SuspendedSettingsPage = withSuspense(SettingsPage);
const SuspendedOwnerProfilePage = withSuspense(OwnerProfilePage);
const SuspendedBusinessProfilePage = withSuspense(BusinessProfilePage);
const SuspendedCreateBusinessPage = withSuspense(CreateBusinessPage);
const SuspendedNotFoundPage = withSuspense(NotFoundPage);
const SuspendedErrorPage = withSuspense(ErrorPage);
const SuspendedDesignSystemPage = DesignSystemPage ? withSuspense(DesignSystemPage) : null;

// This module is app-level router composition, not a hot-reloadable component module.
// eslint-disable-next-line react-refresh/only-export-components
function AppShellProviders() {
  return (
    <SaleDraftProvider>
      <DashboardPeriodProvider>
        <InventoryFilterProvider>
          <AppLayout />
        </InventoryFilterProvider>
      </DashboardPeriodProvider>
    </SaleDraftProvider>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <SuspendedErrorPage />,
    children: [
      {
        element: <BusinessGate />,
        children: [
          {
            element: <AppShellProviders />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              {
                path: 'dashboard',
                element: <SuspendedDashboardPage />,
              },
              {
                path: 'products',
                element: <SuspendedProductsPage />,
              },
              {
                path: 'products/:productId',
                element: <SuspendedProductDetailPage />,
                handle: { subPage: true },
              },
              {
                path: 'sales',
                element: <SuspendedSalesPage />,
                handle: { aside: SaleDock },
              },
              {
                path: 'sales/all',
                element: <SuspendedAllSalesPage />,
                handle: { subPage: true },
              },
              {
                path: 'sales/:saleId',
                element: <SuspendedSaleDetailPage />,
                handle: { subPage: true },
              },
              {
                path: 'inventory',
                element: <SuspendedInventoryPage />,
              },
              {
                path: 'inventory/batches',
                element: <SuspendedBatchesPage />,
                handle: { subPage: true },
              },
              {
                path: 'inventory/batches/:batchId',
                element: <SuspendedBatchDetailPage />,
                handle: { subPage: true },
              },
              {
                path: 'inventory/products/:productId',
                element: <SuspendedProductInventoryDetailPage />,
                handle: { subPage: true },
              },
              {
                path: 'settings',
                element: <SuspendedSettingsPage />,
                handle: { subPage: true },
              },
              {
                path: 'settings/profile',
                element: <SuspendedOwnerProfilePage />,
                handle: { subPage: true },
              },
              {
                path: 'settings/business',
                element: <SuspendedBusinessProfilePage />,
                handle: { subPage: true },
              },
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
            element: <SuspendedCreateBusinessPage />,
          },
        ],
      },
    ],
  },
  {
    element: <RegistrationLayout guestOnly />,
    errorElement: <SuspendedErrorPage />,
    children: [
      {
        path: 'login',
        element: <SuspendedLoginPage />,
      },
      {
        path: 'signup',
        element: <SuspendedSignupPage />,
      },
    ],
  },
  {
    element: <RegistrationLayout />,
    errorElement: <SuspendedErrorPage />,
    children: [
      {
        path: 'verify-email',
        element: <SuspendedVerifyEmailPage />,
      },
    ],
  },
  ...(SuspendedDesignSystemPage
    ? [
        {
          path: '/design-system',
          element: <SuspendedDesignSystemPage />,
        },
      ]
    : []),
  {
    path: '*',
    element: <SuspendedNotFoundPage />,
  },
]);
