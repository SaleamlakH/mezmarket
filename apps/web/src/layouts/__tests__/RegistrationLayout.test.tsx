import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useAuthContext } from '@/providers/auth-provider/useAuthContext';
import { RegistrationLayout } from '@/layouts/RegistrationLayout';

vi.mock('@/providers/auth-provider/useAuthContext');
vi.mock('@/components/ThemeToggle', () => ({ ThemeToggle: () => <div>Theme Toggle</div> }));

function renderWithRoutes({
  guestOnly,
  initialEntry = '/login',
}: {
  guestOnly: boolean;
  initialEntry?: string;
}) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<div>Home Page</div>} />
        <Route element={<RegistrationLayout guestOnly={guestOnly} />}>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/businesses/new" element={<div>Business Creation</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('RegistrationLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while auth is loading in guest-only mode', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'loading', user: null },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes({ guestOnly: true });

    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });

  it('renders guest routes when the user is a guest', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'guest', user: null },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes({ guestOnly: true });

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });

  it('redirects authenticated users away from guest routes', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'authenticated', user: { id: 'u1', email: 'a@b.com' } },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes({ guestOnly: true });

    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('does not redirect authenticated users when guestOnly is false', () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: { status: 'authenticated', user: { id: 'u1', email: 'a@b.com' } },
    } as ReturnType<typeof useAuthContext>);

    renderWithRoutes({ guestOnly: false, initialEntry: '/businesses/new' });

    expect(screen.getByText('Business Creation')).toBeInTheDocument();
    expect(screen.queryByText('Home Page')).not.toBeInTheDocument();
  });
});
