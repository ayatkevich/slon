import { PGlite } from '@electric-sql/pglite';
import { afterAll, describe, expect, test } from '@jest/globals';
import { readFile } from 'fs/promises';

describe('SLON – Semantically-Loose Object Network', () => {
  const pg = new PGlite();
  afterAll(() => pg.close());

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

    any_symbol_equals_special_symbol_any: {
      const { rows } = await pg.sql`select @'A' = @'*' as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    special_symbol_any_equals_any_symbol: {
      const { rows } = await pg.sql`select @'*' = @'A' as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    special_symbol_any_equals_special_symbol_any: {
      const { rows } = await pg.sql`select @'*' = @'*' as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }
  });

  test('object', async () => {
    object_is_a_pair_of_symbols: {
      const { rows } = await pg.sql`select (@'A' | @'a').*`;
      expect(rows).toEqual([{ id: 'A | a', index: 1, left: 'A', right: 'a' }]);
    }

    for_simplicity_symbol_sign_is_not_necessary: {
      const { rows } = await pg.sql`select ('A' | 'a').*`;
      expect(rows).toEqual([{ id: 'A | a', index: 1, left: 'A', right: 'a' }]);
    }

    objects_are_persisted: {
      const { rows } = await pg.sql`select * from "slon_object"`;
      expect(rows).toEqual([{ id: 'A | a', index: 1, left: 'A', right: 'a' }]);
    }

    object_equals_same_object: {
      const { rows } =
        await pg.sql`select (@'A' | @'a') = ('A' | 'a') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    object_does_not_equal_different_object: {
      const { rows } =
        await pg.sql`select (@'A' | @'a') = ('a' | 'A') as "result"`;
      expect(rows).toEqual([{ result: false }]);
    }

    special_symbol_any_can_be_used_for_pattern_matching: {
      const { rows } =
        await pg.sql`select ('A' | '*') = ('A' | 'a') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    special_symbol_any_can_be_used_for_pattern_matching: {
      const { rows } =
        await pg.sql`select ('A' | '*') = ('B' | 'b') as "result"`;
      expect(rows).toEqual([{ result: false }]);
    }

    special_symbol_any_can_be_used_for_pattern_matching: {
      const { rows } =
        await pg.sql`select ('A' | '*') = ('*' | 'a') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }
  });

  test('node', async () => {
    node_is_a_pair_of_objects: {
      const { rows } =
        await pg.sql`select to_json(('A' | 'a') & ('B' | 'b')) as "result"`;
      expect(rows).toEqual([
        {
          result: {
            id: 'A | a & B | b',
            index: 1,
            effect: expect.objectContaining({ id: 'A | a' }),
            payload: expect.objectContaining({ id: 'B | b' }),
          },
        },
      ]);
    }

    or_node_is_just_a_single_object_without_payload: {
      const { rows } = await pg.sql`select to_json(& ('A' | 'a')) as "result"`;
      expect(rows).toEqual([
        {
          result: {
            id: 'A | a & null',
            index: 2,
            effect: expect.objectContaining({ id: 'A | a' }),
            payload: null,
          },
        },
      ]);
    }

    nodes_are_persisted: {
      const { rows } = await pg.sql`
        select "id", ("effect")."id" as "effect", ("payload")."id" as "payload"
          from "slon_node"
          order by "index"
      `;
      expect(rows).toEqual([
        { id: 'A | a & B | b', effect: 'A | a', payload: 'B | b' },
        { id: 'A | a & null', effect: 'A | a', payload: null },
      ]);
    }
  });
});
