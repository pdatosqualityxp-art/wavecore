import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';
import { ThemeProvider } from '../../shared/context/ThemeContext';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { supabase } from '../../shared/lib/supabase';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInAnonymously: vi.fn(),
    },
  },
}));

function renderLogin() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<h1>Home route</h1>} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

describe('Login', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the email and password fields and guest sign-in action', () => {
    renderLogin();

    expect(screen.getByRole('textbox', { name: 'Correo electrónico' })).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar como invitado' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'WaveCore' })).toHaveAttribute('src', expect.stringContaining('logo'));
    expect(screen.queryByRole('button', { name: 'Cambiar tema' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Idioma' }));
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Español',
      'Català',
      'English',
    ]);
  });

  it('keeps language names and order unchanged when the interface language changes', () => {
    renderLogin();
    const languageButton = screen.getByRole('button', { name: 'Idioma' });

    for (const language of ['ca', 'en']) {
      fireEvent.click(languageButton);
      expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
        'Español',
        'Català',
        'English',
      ]);
      fireEvent.click(screen.getByRole('option', { name: language === 'ca' ? 'Català' : 'English' }));
    }
  });

  it('starts anonymous sign-in and navigates to home when successful', async () => {
    vi.mocked(supabase.auth.signInAnonymously).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never);
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Entrar como invitado' }));

    await waitFor(() => {
      expect(supabase.auth.signInAnonymously).toHaveBeenCalledOnce();
    });
    expect(await screen.findByRole('heading', { name: 'Home route' })).toBeInTheDocument();
  });

  it('shows setup guidance when anonymous sign-ins are disabled in Supabase', async () => {
    vi.mocked(supabase.auth.signInAnonymously).mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'anonymous_provider_disabled' },
    } as never);
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: 'Entrar como invitado' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El acceso de invitado está desactivado en Supabase. Activa Anonymous Sign-Ins en Authentication > Sign In / Providers.',
    );
  });

  it('submits entered email and password with the standard auth flow', async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    } as never);
    renderLogin();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'user-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'person@example.com',
        password: 'user-password',
      });
    });
  });
});
