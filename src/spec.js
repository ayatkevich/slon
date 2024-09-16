import { PGlite } from '@electric-sql/pglite';
import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

describe('SLON – Semantically-Loose Object Network', () => {
  const pg = new PGlite();

  test('install', async () => {
    await pg.exec(await readFile('./src/slon.sql', 'utf-8'));
  });

  test('symbol', async () => {
    noSymbolsRegistered: {
      const { rows } = await pg.sql`select * from "slon_symbol"`;
      expect(rows).toEqual([]);
    }

    addSomeSymbols: {
      const { rows } = await pg.sql`select to_json(@'A') as "result"`;
      expect(rows).toEqual([{ result: { id: 'A', index: 1 } }]);
    }

    symbolsArePersisted: {
      const { rows } = await pg.sql`select * from "slon_symbol"`;
      expect(rows).toEqual([{ id: 'A', index: 1 }]);
    }
  });

  test('object', async () => {
    objectIsAPairOfTextSymbols: {
      const { rows } = await pg.sql`select ('A' | 'a').*`;
      expect(rows).toEqual([{ left: 'A', right: 'a' }]);
    }

    objectIsAPairOfSymbols: {
      const { rows } = await pg.sql`select (@'A' | @'a').*`;
      expect(rows).toEqual([{ left: 'A', right: 'a' }]);
    }

    symbolsArePersistedAndReused: {
      const { rows } = await pg.sql`select "id" from "slon_symbol"`;
      expect(rows).toEqual([{ id: 'A' }, { id: 'a' }]);
    }
  });
});
