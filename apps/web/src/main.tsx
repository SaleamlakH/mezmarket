import './styles/token.css';
import './styles/global.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { RouterProvider } from 'react-router/dom';
import { createBrowserRouter } from 'react-router';
import { AuthLayout } from './layouts/AuthLayout.tsx';
import { LoginPage } from './features/auth/pages/LoginPage.tsx';
import { SignupPage } from './features/auth/pages/SignupPage.tsx';
import { ThemeProvider } from './context/theme/ThemeProvider.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
