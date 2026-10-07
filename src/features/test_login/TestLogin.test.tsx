import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TestLogin from './TestLogin';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { supabase } from '../../shared/lib/supabase';

vi.mock('../../shared/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}));

function renderTestLogin() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/test_login']}>
        <Routes>
          <Route path="/test_login" element={<TestLogin />} />
          <Route path="/login" element={<h1>Login route</h1>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );
}

describe('TestLogin', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_TABLES', 'customers');
    localStorage.clear();
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
      error: null,
    } as never);
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: () => ({
            limit: async () => ({
              data: [{ id: 1, name: 'Visible row' }],
              error: null,
            }),
          }),
        }) as never,
    );
  });

  it('loads configured tables and renders their rows', async () => {
    renderTestLogin();

    expect(await screen.findByRole('heading', { name: 'customers' })).toBeInTheDocument();
    expect(screen.getByText(/Visible row/)).toBeInTheDocument();
    expect(supabase.from).toHaveBeenCalledOnce();
    expect(supabase.from).toHaveBeenCalledWith('customers');
  });

  it('redirects to login when there is no active session', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    renderTestLogin();

    expect(await screen.findByRole('heading', { name: 'Login route' })).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('explains how to configure tables when the allowlist is empty', async () => {
    vi.stubEnv('VITE_SUPABASE_TABLES', '');
    renderTestLogin();

    expect(await screen.findByText(/VITE_SUPABASE_TABLES/)).toBeInTheDocument();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('shows table query errors instead of hiding them', async () => {
    vi.mocked(supabase.from).mockImplementation(
      () =>
        ({
          select: () => ({
            limit: async () => ({
              data: null,
              error: { message: 'permission denied' },
            }),
          }),
        }) as never,
    );
    renderTestLogin();

    expect(await screen.findByText('permission denied')).toBeInTheDocument();
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('customers'));
  });
});
