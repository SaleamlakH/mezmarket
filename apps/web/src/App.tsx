import { createBrowserRouter } from 'react-router';
import { ThemeProvider } from './context/theme/ThemeProvider';
import { RouterProvider } from 'react-router/dom';
import { ProtectedRoute } from './layouts/ProtectedRoute';
import { AuthLayout } from './features/auth/layouts/AuthLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { SignupPage } from './features/auth/pages/SignupPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <ProtectedRoute />,
  },
  {
    element: <AuthLayout />,
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
]);

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
