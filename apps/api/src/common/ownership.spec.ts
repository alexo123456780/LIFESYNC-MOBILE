import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
  RESOURCE_NOT_FOUND_MESSAGE,
  assertOwnedMutation,
  assertOwnedRecord,
  ownedWhere,
} from './ownership.js';

describe('anti-IDOR ownership helpers (LM-63)', () => {
  it('construye siempre el filtro compuesto { id, userId }', () => {
    expect(ownedWhere('rec-1', 'user-a')).toEqual({ id: 'rec-1', userId: 'user-a' });
  });

  it('devuelve el registro cuando pertenece al usuario autenticado', () => {
    const record = { id: 'rec-1', userId: 'user-a', name: 'Penicilina' };
    expect(assertOwnedRecord(record)).toBe(record);
  });

  it('lanza 404 con el mismo mensaje cuando el registro no existe o es de otro usuario', () => {
    expect(() => assertOwnedRecord(null)).toThrow(NotFoundException);
    expect(() => assertOwnedRecord(undefined)).toThrow(RESOURCE_NOT_FOUND_MESSAGE);
  });

  it('valida updateMany/deleteMany afectados y lanza 404 cuando es 0', () => {
    expect(() => assertOwnedMutation(1)).not.toThrow();
    expect(() => assertOwnedMutation(0)).toThrow(new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE));
  });
});
