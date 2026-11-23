import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

export interface UnifiedErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

const DEFAULT_ERROR_LABEL: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

/** Garantiza el formato único `{ statusCode, message, error }` sin filtrar trazas internas. */
@Catch()
export class UnifiedHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const raw = exception.getResponse();
      const body = this.normalizeHttpException(statusCode, raw, exception.message);
      response.status(statusCode).json(body);
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error interno del servidor',
      error: DEFAULT_ERROR_LABEL[HttpStatus.INTERNAL_SERVER_ERROR],
    } satisfies UnifiedErrorBody);
  }

  private normalizeHttpException(
    statusCode: number,
    raw: string | object,
    fallbackMessage: string,
  ): UnifiedErrorBody {
    const defaultError = DEFAULT_ERROR_LABEL[statusCode] ?? 'Error';
    if (typeof raw === 'string') {
      return { statusCode, message: raw, error: defaultError };
    }
    const record = raw as Partial<UnifiedErrorBody>;
    return {
      statusCode,
      message: record.message ?? fallbackMessage,
      error: typeof record.error === 'string' && record.error ? record.error : defaultError,
    };
  }
}
