import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../shared/i18n/LanguageContext';
import * as agentCompanyApi from './agentCompanyApi';
import AgentCompany from './AgentCompany';

describe('AgentCompany', () => {
  let askCompanyAssistant: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    askCompanyAssistant = vi.spyOn(agentCompanyApi, 'askCompanyAssistant');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function renderPage() {
    return render(
      <LanguageProvider>
        <AgentCompany />
      </LanguageProvider>,
    );
  }

  it('shows the chat, sends a question, and displays the agent reply', async () => {
    askCompanyAssistant.mockResolvedValue('Tenemos clientes en Barcelona y Madrid.');
    renderPage();

    expect(screen.getByRole('heading', { name: 'Asistente virtual corporativo' })).toBeInTheDocument();
    expect(screen.getByText('¿En qué puedo ayudarte? Escribe una pregunta sobre la empresa.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar pregunta' })).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu pregunta' }), {
      target: { value: '¿Qué clientes tenemos?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));

    expect(await screen.findByText('Tenemos clientes en Barcelona y Madrid.')).toBeInTheDocument();
    expect(screen.getByText('¿Qué clientes tenemos?')).toBeInTheDocument();
    expect(askCompanyAssistant).toHaveBeenCalledWith('¿Qué clientes tenemos?');
  });

  it('restores the question after a failure and retries without duplicating the user message', async () => {
    askCompanyAssistant
      .mockRejectedValueOnce(new agentCompanyApi.ChatApiError('network'))
      .mockResolvedValueOnce('Respuesta recuperada.');
    renderPage();

    fireEvent.change(screen.getByRole('textbox', { name: 'Escribe tu pregunta' }), {
      target: { value: 'Pregunta de prueba' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar pregunta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el asistente.');
    expect(screen.getByRole('textbox', { name: 'Escribe tu pregunta' })).toHaveValue('Pregunta de prueba');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Respuesta recuperada.')).toBeInTheDocument();
    expect(screen.getAllByText('Pregunta de prueba')).toHaveLength(1);
    expect(askCompanyAssistant).toHaveBeenCalledTimes(2);
  });

  it('keeps line breaks in messages and submits Enter without Shift', async () => {
    askCompanyAssistant.mockResolvedValue('Respuesta');
    renderPage();

    const composer = screen.getByRole('textbox', { name: 'Escribe tu pregunta' });
    fireEvent.change(composer, { target: { value: 'Primera línea' } });
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: false });

    await waitFor(() => expect(askCompanyAssistant).toHaveBeenCalledWith('Primera línea'));
    expect(await screen.findByText('Respuesta')).toBeInTheDocument();
  });
});
