import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { URL, fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));

const lint = (message) =>
  spawnSync('npx', ['--no-install', 'commitlint'], { cwd: root, input: message, encoding: 'utf8' });

test('acepta tipo(ámbito): mensaje [LM-n]', () => {
  assert.equal(lint('chore(repo): configurar linting [LM-5]').status, 0);
});

test('rechaza un mensaje sin clave LM-n', () => {
  const result = lint('chore(repo): configurar linting');
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /clave de Jira/);
});

test('rechaza una clave de otro proyecto', () => {
  assert.notEqual(lint('chore(repo): configurar linting [LIFE-5]').status, 0);
});

test('rechaza un mensaje fuera de la convención', () => {
  assert.notEqual(lint('arreglos varios [LM-5]').status, 0);
});
