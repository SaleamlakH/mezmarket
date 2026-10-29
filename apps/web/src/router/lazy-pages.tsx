import { lazy } from 'react';

export const HomePage = lazy(() =>
  import('@/features/home/pages/HomePage').then((module) => ({
    default: module.HomePage,
  })),
);
export const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
export const SignupPage = lazy(() =>
  import('@/features/auth/pages/SignupPage').then((module) => ({ default: module.SignupPage })),
);
export const VerifyEmailPage = lazy(() =>
  import('@/features/auth/pages/VerifyEmailPage').then((module) => ({
    default: module.VerifyEmailPage,
  })),
);
export const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);

export const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
export const ProductsPage = lazy(() =>
  import('@/features/products/pages/ProductsPage').then((module) => ({
    default: module.ProductsPage,
  })),
);
export const ProductDetailPage = lazy(() =>
  import('@/features/products/pages/ProductDetailPage').then((module) => ({
    default: module.ProductDetailPage,
  })),
);
export const SalesPage = lazy(() =>
  import('@/features/sales/pages/SalesPage').then((module) => ({ default: module.SalesPage })),
);
export const AllSalesPage = lazy(() =>
  import('@/features/sales/pages/AllSalesPage').then((module) => ({
    default: module.AllSalesPage,
  })),
);
export const SaleDetailPage = lazy(() =>
  import('@/features/sales/pages/SaleDetailPage').then((module) => ({
    default: module.SaleDetailPage,
  })),
);
export const InventoryPage = lazy(() =>
  import('@/features/inventory/pages/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  })),
);
export const BatchesPage = lazy(() =>
  import('@/features/inventory/pages/BatchesPage').then((module) => ({
    default: module.BatchesPage,
  })),
);
export const BatchDetailPage = lazy(() =>
  import('@/features/inventory/pages/BatchDetailPage').then((module) => ({
    default: module.BatchDetailPage,
  })),
);
export const ProductInventoryDetailPage = lazy(() =>
  import('@/features/inventory/pages/ProductInventoryDetailPage').then((module) => ({
    default: module.ProductInventoryDetailPage,
  })),
);
export const SettingsPage = lazy(() =>
  import('@/features/settings/pages/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
export const OwnerProfilePage = lazy(async () => {
  const [{ OwnerProfilePage: Page }, { ownerApi }] = await Promise.all([
    import('@/features/owner-profile/pages/OwnerProfilePage'),
    import('@/features/owner-profile/api/ownerApi'),
  ]);

  return { default: () => <Page ownerApi={ownerApi} /> };
});
export const BusinessProfilePage = lazy(() =>
  import('@/features/business/pages/BusinessProfilePage').then((module) => ({
    default: module.BusinessProfilePage,
  })),
);
export const CreateBusinessPage = lazy(() =>
  import('@/features/business/pages/CreateBusinessPage').then((module) => ({
    default: module.CreateBusinessPage,
  })),
);
export const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
);
export const ErrorPage = lazy(() =>
  import('@/pages/ErrorPage').then((module) => ({ default: module.ErrorPage })),
);
export const SaleDock = lazy(() =>
  import('@/features/sales/components/SaleDock').then((module) => ({ default: module.SaleDock })),
);
// DEV-only route target; null in production so the chunk is never bundled.
// eslint-disable-next-line react-refresh/only-export-components
export const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('@/DesignSystem').then((module) => ({ default: module.DesignSystem })))
  : null;
