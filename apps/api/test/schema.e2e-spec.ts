import { DatabaseConnection } from '../src/database/database-connection.js';

// Requiere DATABASE_URL apuntando a una base con `prisma migrate deploy` ya aplicado.
describe('esquema de identidad (migración inicial)', () => {
  const prisma = DatabaseConnection.getInstance().client;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const columnsOf = async (table: string): Promise<string[]> => {
    const rows = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table}`;
    return rows.map((row) => row.column_name);
  };

  it('crea las tablas User, AuthorizationCode y RefreshToken', async () => {
    const rows = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    expect(rows.map((row) => row.table_name)).toEqual(
      expect.arrayContaining(['User', 'AuthorizationCode', 'RefreshToken']),
    );
  });

  it('guarda solo hashes, nunca contraseñas, códigos o tokens en claro', async () => {
    const user = await columnsOf('User');
    const code = await columnsOf('AuthorizationCode');
    const token = await columnsOf('RefreshToken');

    expect(user).toContain('passwordHash');
    expect(user).not.toContain('password');
    expect(code).toContain('codeHash');
    expect(code).not.toContain('code');
    expect(token).toContain('tokenHash');
    expect(token).not.toContain('token');
  });
});
