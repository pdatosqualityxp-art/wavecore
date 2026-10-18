import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import StackInfo from './StackInfo';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';

describe('StackInfo', () => {
  afterEach(cleanup);

  it('presents the technologies and architecture in grouped sections', () => {
    const { container } = render(
      <LanguageProvider>
        <StackInfo />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Stack Tecnológico' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Entorno de desarrollo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Frontend' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Base de datos y documentos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backend 1 · Agente de consultas' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Backend 2 · Documentos y agente de datos' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Arquitectura de software' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'React' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Python' })).toBeInTheDocument();
    const geminiCards = screen.getAllByRole('heading', { name: 'Google Gemini API' });
    expect(geminiCards).toHaveLength(2);
    expect(geminiCards[1].closest('article')?.parentElement?.closest('article')).toHaveTextContent(
      'Backend 2 · Documentos y agente de datos',
    );
    for (const headingName of ['Entorno de desarrollo', 'Frontend', 'Control de versiones', 'Base de datos y documentos', 'Arquitectura de software']) {
      const heading = screen.getByRole('heading', { name: headingName });
      expect(heading.closest('section')?.querySelector(':scope > article.ui-surface')).toBeInTheDocument();
    }
    expect(container.querySelectorAll('article svg').length).toBeGreaterThan(10);
  });
});
