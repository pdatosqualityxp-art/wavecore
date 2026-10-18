import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './shared/context/AuthContext';
import { ThemeProvider } from './shared/context/ThemeContext';
import { LanguageProvider } from './shared/i18n/LanguageContext';
import { supabase } from './shared/lib/supabase';

vi.mock('./shared/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe('App routes', () => {
  let authListener: Parameters<typeof supabase.auth.onAuthStateChange>[0] | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    authListener = undefined;
    vi.mocked(supabase.from).mockImplementation((table) => {
      if (table === 'ventas') {
        return {
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as never;
      }

      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      return query as never;
    });
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authListener = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } } as never;
    });
  });

  afterEach(cleanup);

  function renderApp(initialEntries = ['/']) {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={initialEntries}>
              <App />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );
  }

  function authenticate() {
    act(() => {
      authListener?.('INITIAL_SESSION', {
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          user_metadata: {},
          is_anonymous: false,
        },
      } as Session);
    });
  }

  it('navigates between the home page and available routes', async () => {
    renderApp();

    authenticate();

    expect(await screen.findByRole('heading', {
      name: 'Una visión ejecutiva unificada para crecimiento y oportunidades de mercado.',
    })).toBeInTheDocument();

    const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
    fireEvent.click(within(navigation).getByRole('link', { name: 'Asistente Virtual' }));
    expect(await screen.findByRole('heading', { name: 'Asistente virtual corporativo' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Asistente Virtual' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(navigation).getByRole('link', { name: 'Repositorio' }));
    expect(await screen.findByRole('heading', { name: 'Repositorio documental' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Repositorio' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(navigation).getByRole('link', { name: 'Agente I.A.' }));
    expect(await screen.findByRole('heading', { name: 'Agente I.A.' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Agente I.A.' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(navigation).getByRole('link', { name: 'Dashboard Ventas' }));
    expect(await screen.findByRole('heading', { name: 'Resumen comercial' })).toBeInTheDocument();

    fireEvent.click(within(navigation).getByRole('link', { name: 'Control Servicios' }));
    expect(await screen.findByRole('heading', { name: 'Control Servicios' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Control Servicios' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(navigation).getByRole('link', { name: 'Stack Tecnológico' }));
    expect(await screen.findByRole('heading', { name: 'Stack Tecnológico' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Stack Tecnológico' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(within(navigation).getByRole('link', { name: 'Modelos' }));
    expect(await screen.findByRole('heading', { name: 'Modelos' })).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Modelos' })).toHaveAttribute('aria-current', 'page');
  });

  it('redirects the legacy stack route to the new feature route', async () => {
    renderApp(['/stack']);
    authenticate();

    expect(await screen.findByRole('heading', { name: 'Stack Tecnológico' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Stack Tecnológico' })).toHaveAttribute('aria-current', 'page');
  });
});
