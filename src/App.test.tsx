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

    fireEvent.click(screen.getByRole('link', { name: 'Stack Tecnológico' }));
    expect(await screen.findByRole('heading', { name: 'Stack Tecnológico' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'IoT' }));
    expect(await screen.findByRole('heading', { name: 'IoT' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Inicio' }));
    expect(await screen.findByRole('heading', {
      name: 'Una visión ejecutiva unificada para crecimiento, mercado e IoT.',
    })).toBeInTheDocument();
  });
});
