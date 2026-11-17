import { HttpException } from '@nestjs/common';

/** Error con el formato de la RFC 6749 §5.2: `{ error, error_description }`. */
export class OAuthError extends HttpException {
  constructor(error: string, description: string, status = 400) {
    super({ error, error_description: description }, status);
  }
}
