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
      sources: [{
        id: 'source-1',
        type: 'sales',
        reference: 'Ventas del cuarto trimestre',
        details: { period: '2025-Q4' },
      }],
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
      .mockResolvedValueOnce({ answer: 'Respuesta recuperada.', sources: [] });
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
});
