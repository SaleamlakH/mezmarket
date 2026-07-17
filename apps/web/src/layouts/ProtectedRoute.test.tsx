import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('@/providers/auth-provider/useAuthContext');

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          element=<ProtectedRoute />
          children={<Route path="/" element={<div>Protected Content</div>} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state and not the protected content while status is loading', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'loading', user: null },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes();

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when status is guest', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'guest', user: null },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes();

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the protected content when status is authenticated', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'authenticated', user: { id: 'u1', email: 'a@b.com' } },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes();

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });
});
