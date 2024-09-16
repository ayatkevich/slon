import { PGlite } from '@electric-sql/pglite';
import { describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

describe('SLON – Semantically-Loose Object Network', () => {
  const pg = new PGlite();

  test('install', async () => {
    await pg.exec(await readFile('./src/slon.sql', 'utf-8'));
  });

  test('symbol', async () => {
    no_symbols_registered: {
      const { rows } = await pg.sql`select * from "slon_symbol"`;
      expect(rows).toEqual([]);
    }

    add_some_symbols: {
      const { rows } = await pg.sql`select to_json(@'A') as "result"`;
      expect(rows).toEqual([{ result: { id: 'A', index: 1 } }]);
    }

    symbols_are_persisted: {
      const { rows } = await pg.sql`select * from "slon_symbol"`;
      expect(rows).toEqual([{ id: 'A', index: 1 }]);
    }

    symbol_equals_same_symbol: {
      const { rows } = await pg.sql`select @'A' = @'A' as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    symbol_does_not_equal_different_symbol: {
      const { rows } = await pg.sql`select @'A' = @'a' as "result"`;
      expect(rows).toEqual([{ result: false }]);
    }

    symbols_are_persisted_and_reused: {
      const { rows } =
        await pg.sql`select "id" from "slon_symbol" order by "id"`;
      expect(rows).toEqual([{ id: 'A' }, { id: 'a' }]);
    }

    symbol_equals_special_symbol_any: {
      const { rows } = await pg.sql`select @'A' = @'*' as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }
  });

  test('object', async () => {
    object_is_a_pair_of_text_symbols: {
      const { rows } = await pg.sql`select ('A' | 'a').*`;
      expect(rows).toEqual([{ left: 'A', right: 'a' }]);
    }

    object_is_a_pair_of_symbols: {
      const { rows } = await pg.sql`select (@'A' | @'a').*`;
      expect(rows).toEqual([{ left: 'A', right: 'a' }]);
    }
  });
});
