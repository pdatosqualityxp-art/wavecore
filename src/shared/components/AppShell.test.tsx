import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../i18n/LanguageContext';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

describe('AppShell', () => {
  let authListener: ((event: string, session: { user: unknown } | null) => void) | undefined;
  let profileResult: {
    data: { id: string; display_name: string | null; email: string | null } | null;
    error: { message: string } | null;
  };
  let maybeSingle: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authListener = undefined;
    profileResult = {
      data: { id: 'user-1', display_name: 'Alex Rivera', email: 'alex@example.com' },
      error: null,
    };
    maybeSingle = vi.fn().mockImplementation(() => Promise.resolve(profileResult));
    eq = vi.fn().mockReturnValue({ maybeSingle });
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({ eq }),
    } as never);
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authListener = callback as typeof authListener;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
  });

  afterEach(cleanup);

  function renderShell() {
    return render(
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter>
              <AppShell />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  }

  it('renders the navigation, user identity, and interactive menu settings', async () => {
    const { container } = renderShell();
    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Rivera' },
          is_anonymous: false,
        },
      });
    });

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
    const dashboardLink = screen.getByRole('link', { name: 'Dashboard Ventas' });
    const agentCompanyLink = screen.getByRole('link', { name: 'Consulta de empresa' });
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    expect(agentCompanyLink).toHaveAttribute('href', '/agent-company');
    expect(dashboardLink.compareDocumentPosition(agentCompanyLink) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Internet of Things')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'IoT' })).toHaveAttribute('href', '/iot');
    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(supabase.from).toHaveBeenCalledWith('z_users');
    expect(eq).toHaveBeenCalledWith('id', 'user-1');

    const sidebarHeader = container.querySelector('.ui-sidebar-header');
    const sidebarNav = container.querySelector('.ui-sidebar-nav');
    expect(sidebarHeader?.className).toContain('h-16');
    expect(sidebarNav?.className).toContain('mt-5');

    expect(screen.getByTestId('desktop-theme-toggle')).toBeInTheDocument();
    expect(document.documentElement).toHaveClass('dark');
    fireEvent.click(screen.getByTestId('desktop-menu-toggle'));
    expect(sidebarHeader?.className).toContain('h-16');
    expect(sidebarHeader?.className).not.toContain('md:h-24');
    expect(sidebarNav?.className).toContain('mt-5');
    expect(sidebarNav?.className).not.toContain('md:mt-7');
    expect(screen.queryByTestId('desktop-theme-toggle')).not.toBeInTheDocument();
    const collapsedLogo = screen.getByTestId('desktop-brand-toggle');
    expect(collapsedLogo).toHaveAttribute('aria-label', 'Expandir menú');
    fireEvent.click(collapsedLogo);
    expect(screen.getByTestId('desktop-theme-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-menu-toggle')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Cambiar a modo claro' })[0]);
    expect(document.documentElement).not.toHaveClass('dark');
    fireEvent.click(screen.getAllByRole('button', { name: 'Cambiar a modo oscuro' })[0]);
    expect(document.documentElement).toHaveClass('dark');
    fireEvent.click(screen.getByRole('button', { name: 'Idioma' }));
    expect(screen.getByRole('listbox', { name: 'Idioma' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'English' }));

    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(screen.queryByRole('listbox', { name: 'Idioma' })).not.toBeInTheDocument();
  });

  it('uses the fold control to close the mobile drawer', () => {
    renderShell();

    const openMenuButton = screen.getByRole('button', { name: 'Abrir menú' });
    fireEvent.click(openMenuButton);
    expect(openMenuButton).toHaveAttribute('aria-expanded', 'true');

    const sidebar = within(screen.getByRole('complementary'));
    expect(sidebar.getByTestId('desktop-theme-toggle')).toBeInTheDocument();
    expect(sidebar.getByRole('button', { name: 'Cerrar menú' })).toBeInTheDocument();
    expect(sidebar.getByTestId('desktop-menu-toggle')).toHaveClass('ui-sidebar-desktop-control');

    fireEvent.click(sidebar.getByRole('button', { name: 'Cerrar menú' }));
    expect(openMenuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts in dark mode even when light mode was previously saved', () => {
    localStorage.setItem('wavecore-theme', 'light');

    renderShell();

    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('wavecore-theme')).toBe('dark');
  });

  it('updates the displayed account when the Supabase session changes', async () => {
    renderShell();
    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Rivera' },
          is_anonymous: false,
        },
      });
    });
    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument();

    act(() => authListener?.('SIGNED_OUT', null));
    expect(screen.getAllByText('Invitado').length).toBeGreaterThan(0);
  });

  it('opens the account menu and signs out successfully', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null } as never);
    renderShell();
    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Rivera' },
          is_anonymous: false,
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Opciones de cuenta' }));
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalledOnce());
  });

  it('shows an error and keeps the account menu open when sign out fails', async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: { message: 'network failure' },
    } as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    renderShell();
    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Rivera' },
          is_anonymous: false,
        },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Opciones de cuenta' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo cerrar la sesión. Inténtalo de nuevo.',
    );
    expect(screen.getByRole('button', { name: 'Opciones de cuenta' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    error.mockRestore();
  });

  it('uses only the z_users profile values for the menu identity', async () => {
    profileResult = {
      data: { id: 'user-1', display_name: 'Database Name', email: 'database@example.com' },
      error: null,
    };
    renderShell();

    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          email: 'auth@example.com',
          user_metadata: { full_name: 'Auth Metadata Name' },
          is_anonymous: false,
        },
      });
    });

    expect(await screen.findByText('Database Name')).toBeInTheDocument();
    expect(screen.getByText('database@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Auth Metadata Name')).not.toBeInTheDocument();
  });

  it('shows the fixed guest identity for anonymous sessions regardless of z_users profile', async () => {
    profileResult = { data: null, error: null };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderShell();

    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'anonymous-user-1',
          email: null,
          user_metadata: {},
          is_anonymous: true,
        },
      });
    });

    expect(await screen.findByText('User Guest')).toBeInTheDocument();
    expect(screen.getByText('WaveCore Guest')).toBeInTheDocument();
    await waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        'No z_users row found for authenticated user:',
        'anonymous-user-1',
      );
    });
    warn.mockRestore();
  });
});
