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
      conversation_id: '490af1b6-7b43-4b09-a941-a528ee5bf7bf',
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
    expect(screen.queryByText('Ventas del cuarto trimestre')).not.toBeInTheDocument();
    expect(screen.getByText('ventas (informe agregado)')).toBeInTheDocument();
    expect(screen.getByText('Fuentes consultadas')).toBeInTheDocument();
    expect(askCfoAgent).toHaveBeenCalledWith('¿Cuáles fueron las ventas?', undefined);
  });

  it('reuses the response conversation ID for follow-up questions', async () => {
    const conversationId = '490af1b6-7b43-4b09-a941-a528ee5bf7bf';
    askCfoAgent
      .mockResolvedValueOnce({
        answer: 'Nova1 es un producto.',
        model: 'gemini-3.5-flash-lite',
        conversation_id: conversationId,
        sources: [],
        consulted_sources: [],
      })
      .mockResolvedValueOnce({
        answer: 'Tiene ventas.',
        model: 'gemini-3.5-flash-lite',
        conversation_id: conversationId,
        sources: [],
        consulted_sources: [],
      });
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: '¿Qué sabes de Nova1?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(await screen.findByText('Nova1 es un producto.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: '¿Y se vende mucho?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));

    expect(await screen.findByText('Tiene ventas.')).toBeInTheDocument();
    expect(askCfoAgent).toHaveBeenNthCalledWith(1, '¿Qué sabes de Nova1?', undefined);
    expect(askCfoAgent).toHaveBeenNthCalledWith(2, '¿Y se vende mucho?', conversationId);
  });

  it('starts without the previous conversation ID after the chat page is remounted', async () => {
    askCfoAgent.mockResolvedValue({
      answer: 'Respuesta.',
      model: 'gemini-3.5-flash-lite',
      conversation_id: '490af1b6-7b43-4b09-a941-a528ee5bf7bf',
      sources: [],
      consulted_sources: [],
    });
    const page = renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: 'Primera conversación' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(await screen.findByText('Respuesta.')).toBeInTheDocument();
    page.unmount();

    renderPage();
    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: 'Nueva conversación' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(await screen.findAllByText('Respuesta.')).toHaveLength(1);

    expect(askCfoAgent).toHaveBeenNthCalledWith(1, 'Primera conversación', undefined);
    expect(askCfoAgent).toHaveBeenNthCalledWith(2, 'Nueva conversación', undefined);
  });

  it('reuses the current conversation ID when retrying a failed follow-up', async () => {
    const conversationId = '490af1b6-7b43-4b09-a941-a528ee5bf7bf';
    askCfoAgent
      .mockResolvedValueOnce({
        answer: 'Primera respuesta.',
        model: 'gemini-3.5-flash-lite',
        conversation_id: conversationId,
        sources: [],
        consulted_sources: [],
      })
      .mockRejectedValueOnce(new agentCfoChatApi.AgentCfoChatApiError('network'))
      .mockResolvedValueOnce({
        answer: 'Seguimiento respondido.',
        model: 'gemini-3.5-flash-lite',
        conversation_id: conversationId,
        sources: [],
        consulted_sources: [],
      });
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: 'Primera pregunta' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(await screen.findByText('Primera respuesta.')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu consulta' }), {
      target: { value: 'Pregunta de seguimiento' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el agente.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }));

    expect(await screen.findByText('Seguimiento respondido.')).toBeInTheDocument();
    expect(askCfoAgent).toHaveBeenNthCalledWith(2, 'Pregunta de seguimiento', conversationId);
    expect(askCfoAgent).toHaveBeenNthCalledWith(3, 'Pregunta de seguimiento', conversationId);
  });

  it('restores a failed query and allows a manual retry without duplicating the message', async () => {
    askCfoAgent
      .mockRejectedValueOnce(new agentCfoChatApi.AgentCfoChatApiError('network'))
      .mockResolvedValueOnce({
        answer: 'Respuesta recuperada.',
        model: 'gemini-3.5-flash-lite',
        conversation_id: '490af1b6-7b43-4b09-a941-a528ee5bf7bf',
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
      conversation_id: '490af1b6-7b43-4b09-a941-a528ee5bf7bf',
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
