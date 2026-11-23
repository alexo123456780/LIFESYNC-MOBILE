import { type ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedHttpExceptionFilter } from './http-exception.filter.js';

function createMockHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('UnifiedHttpExceptionFilter (LM-62)', () => {
  const filter = new UnifiedHttpExceptionFilter();

  it('normaliza BadRequestException con lista de errores de ValidationPipe', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new BadRequestException(['field extra should not exist']), host);
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: ['field extra should not exist'],
      error: 'Bad Request',
    });
  });

  it('normaliza NotFoundException con formato único', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new NotFoundException('Recurso no encontrado'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      statusCode: 404,
      message: 'Recurso no encontrado',
      error: 'Not Found',
    });
  });

  it('oculta detalles internos ante excepciones inesperadas', () => {
    const { host, status, json } = createMockHost();
    filter.catch(new Error('SQL syntax leak'), host);
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error interno del servidor',
      error: 'Internal Server Error',
    });
  });
});
