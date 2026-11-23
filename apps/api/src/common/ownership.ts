import { NotFoundException } from '@nestjs/common';

export const RESOURCE_NOT_FOUND_MESSAGE = 'Recurso no encontrado';

/** Filtro estándar anti-IDOR: toda lectura/edición/borrado por id filtra también por userId. */
export const ownedWhere = (id: string, userId: string): { id: string; userId: string } => ({
  id,
  userId,
});

/** Devuelve el registro o lanza 404 con el mismo mensaje tanto si no existe como si es de otro usuario. */
export function assertOwnedRecord<T>(record: T | null | undefined): T {
  if (record == null) {
    throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
  }
  return record;
}

/** Verifica que `updateMany` o `deleteMany` filtrado por `{ id, userId }` afectó al menos 1 registro. */
export function assertOwnedMutation(affectedCount: number): void {
  if (affectedCount === 0) {
    throw new NotFoundException(RESOURCE_NOT_FOUND_MESSAGE);
  }
}
