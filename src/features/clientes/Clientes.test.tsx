import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import { fetchClients } from './clientesApi';
import Clientes from './Clientes';

vi.mock('./clientesApi', () => ({
  fetchClients: vi.fn(),
}));

const records = [
  { id_cliente: 'C002', nom_cliente: 'Zeta Hostelería', poblacion_cliente: 'Madrid', pais_cliente: 'España' },
  { id_cliente: 'C001', nom_cliente: 'Álvarez Café', poblacion_cliente: 'Barcelona', pais_cliente: 'España' },
  { id_cliente: 'C003', nom_cliente: 'Bistro Paris', poblacion_cliente: null, pais_cliente: 'Francia' },
];

function renderPage() {
  return render(<LanguageProvider><Clientes /></LanguageProvider>);
}

function tableNames() {
  return screen.getAllByRole('row').slice(1).map((row) => row.children[1].textContent);
}

describe('Clientes', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows loading and then clients sorted by name with unavailable fallback', async () => {
    vi.mocked(fetchClients).mockResolvedValue(records);
    renderPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole('row')).toHaveLength(4));
    expect(tableNames()).toEqual(['Álvarez Café', 'Bistro Paris', 'Zeta Hostelería']);
    expect(screen.getAllByText('No disponible').length).toBeGreaterThan(0);
  });

  it('filters by any field ignoring case and accents, and shows no-matches', async () => {
    vi.mocked(fetchClients).mockResolvedValue(records);
    renderPage();
    await screen.findAllByRole('row');
    const input = screen.getByLabelText('Buscar clientes');
    fireEvent.change(input, { target: { value: '  alvarez ' } });
    expect(tableNames()).toEqual(['Álvarez Café']);
    fireEvent.change(input, { target: { value: 'francia' } });
    expect(tableNames()).toEqual(['Bistro Paris']);
    fireEvent.change(input, { target: { value: 'nada' } });
    expect(screen.getByText('No hay clientes que coincidan con la búsqueda.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(tableNames()).toHaveLength(3);
  });

  it('shows an error state', async () => {
    vi.mocked(fetchClients).mockRejectedValue(new Error('fail'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los clientes.');
  });

  it('shows an empty state', async () => {
    vi.mocked(fetchClients).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No hay clientes registrados.')).toBeInTheDocument();
  });
});
