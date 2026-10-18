import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Modelos from './Modelos';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';

describe('Modelos', () => {
  afterEach(cleanup);

  function renderPage() {
    render(
      <LanguageProvider>
        <MemoryRouter>
          <Modelos />
        </MemoryRouter>
      </LanguageProvider>,
    );
  }

  it('shows products grouped in the specified range order', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Modelos' })).toBeInTheDocument();
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Gama Nova',
      'Gama Atlas',
      'Gama Aura',
    ]);

    expect(screen.getByRole('img', { name: 'Nova 1' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Nova 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Atlas 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Atlas 3' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Aura 2' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Aura 3' })).toBeInTheDocument();
  });

  it('shows a translated fallback if a product image fails to load', () => {
    renderPage();

    fireEvent.error(screen.getByRole('img', { name: 'Nova 1' }));
    const novaSection = screen.getByRole('region', { name: 'Gama Nova' });
    expect(within(novaSection).getByRole('status')).toHaveTextContent('Imagen no disponible');
    expect(within(novaSection).getByRole('heading', { name: 'Nova 1' })).toBeInTheDocument();
  });
});
