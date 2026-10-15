import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import * as agentCfoChatApi from './agentCfoChatApi';
import AgentCFOChat from './AgentCFOChat';

describe('AgentCFOChat', () => {
  let askCfoAgent: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    askCfoAgent = vi.spyOn(agentCfoChatApi, 'askCfoAgent');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderPage() {
    return render(
      <LanguageProvider>
        <AgentCFOChat />
      </LanguageProvider>,
    );
  }

  it('sends a query and displays the CFO answer with source references', async () => {
    askCfoAgent.mockResolvedValue({
      answer: 'Las ventas del trimestre fueron de 125.000 €.',
      model: 'gemini-3.5-flash-lite',
      sources: [{
        id: 'source-1',
        type: 'sales',
        reference: 'Ventas del cuarto trimestre',
        details: { period: '2025-Q4' },
      }],
      consulted_sources: [{ type: 'table', reference: 'ventas (informe agregado)' }],
    });
    renderPage();

    expect(screen.getByRole('heading', { name: 'Agente contextual CFO' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: '¿Cuáles fueron las ventas?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByText('Las ventas del trimestre fueron de 125.000 €.')).toBeInTheDocument();
    expect(screen.getByText('Ventas del cuarto trimestre')).toBeInTheDocument();
    expect(screen.getByText('Fuentes consultadas')).toBeInTheDocument();
    expect(askCfoAgent).toHaveBeenCalledWith('¿Cuáles fueron las ventas?');
  });

  it('restores a failed query and allows a manual retry without duplicating the message', async () => {
    askCfoAgent
      .mockRejectedValueOnce(new agentCfoChatApi.AgentCfoChatApiError('network'))
      .mockResolvedValueOnce({
        answer: 'Respuesta recuperada.',
        model: 'gemini-3.5-flash-lite',
        sources: [],
        consulted_sources: [],
      });
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: 'Consulta fallida' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el agente.');
    expect(screen.getByRole('textbox', { name: 'Escribe tu consulta' })).toHaveValue('Consulta fallida');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }));

    expect(await screen.findByText('Respuesta recuperada.')).toBeInTheDocument();
    expect(screen.getAllByText('Consulta fallida')).toHaveLength(1);
    expect(askCfoAgent).toHaveBeenCalledTimes(2);
  });

  it('shows the PDF and table locations even when no evidence rows were found', async () => {
    askCfoAgent.mockResolvedValue({
      answer: 'No se encontró evidencia suficiente.',
      model: 'gemini-3.5-flash-lite',
      sources: [],
      consulted_sources: [
        { type: 'pdf', reference: 'presupuesto' },
        { type: 'table', reference: 'ventas (informe agregado)' },
      ],
    });
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: 'Compara presupuesto y ventas' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByText('PDF:')).toBeInTheDocument();
    expect(screen.getByText('presupuesto')).toBeInTheDocument();
    expect(screen.getByText('Tabla:')).toBeInTheDocument();
    expect(screen.getByText('ventas (informe agregado)')).toBeInTheDocument();
  });
});
