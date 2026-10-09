import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

  it('navigates between the home page and all sample pages', async () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <MemoryRouter initialEntries={['/']}>
              <App />
            </MemoryRouter>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>,
    );

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

    expect(await screen.findByRole('heading', {
      name: 'Una visión ejecutiva unificada para crecimiento, mercado e IoT.',
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Consulta de empresa' }));
    expect(await screen.findByRole('heading', { name: 'Asistente virtual corporativo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Consulta de empresa' })).toHaveAttribute('aria-current', 'page');

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard Ventas' }));
    expect(await screen.findByRole('heading', { name: 'Resumen comercial' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'IoT' }));
    expect(await screen.findByRole('heading', { name: 'IoT' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }));
    expect(await screen.findByRole('heading', {
      name: 'Una visión ejecutiva unificada para crecimiento, mercado e IoT.',
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'IoT' }));
    expect(await screen.findByRole('heading', { name: 'IoT' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }));
    expect(await screen.findByRole('heading', {
      name: 'Una visión ejecutiva unificada para crecimiento, mercado e IoT.',
    })).toBeInTheDocument();
  });
});
