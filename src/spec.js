import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

describe('SLON – Semantically-Loose Object Network', () => {
  const pg = new PGlite();

  beforeAll(async () => {
    await pg.exec(await readFile('./src/slon.sql', 'utf-8'));
  });

  test('object', async () => {
    const { rows } = await pg.sql`select ('a' | 'b').*`;
    expect(rows).toEqual([{ left: 'a', right: 'b' }]);
  });

  test('network', async () => {
    const { rows } = await pg.sql`
      select to_json(
        ('A' | 'a') & array[
          ('B' | 'b'),
          ('C' | 'c')
        ]
      ) as result
    `;
    expect(rows).toEqual([
      { result: { index: 1, parent: null, object: { left: 'A', right: 'a' } } },
      { result: { index: 2, parent: 1, object: { left: 'B', right: 'b' } } },
      { result: { index: 3, parent: 1, object: { left: 'C', right: 'c' } } },
    ]);
  });
});
