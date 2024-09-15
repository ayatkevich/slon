import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from '@jest/globals';

describe('SLON – Semantically-Loose Object Network', () => {
  const pg = new PGlite();

  beforeAll(async () => {
    await pg.exec(/* sql */ `
      create type "slon_object" as (
        "left" text,
        "right" text
      );

      create function "slon_object_constructor" (text, text) returns "slon_object" as $$
        select row($1, $2)::"slon_object";
      $$ language sql immutable;

      create operator | (
        leftArg = text,
        rightArg = text,
        function = "slon_object_constructor"
      );

      create type "slon_relation" as (
        "parent" "slon_object",
        "children" "slon_object"[]
      );

      create function "slon_relation_constructor" ("slon_object", "slon_object"[]) returns "slon_relation" as $$
        select row($1, $2)::"slon_relation";
      $$ language sql immutable;

      create operator & (
        leftArg = "slon_object",
        rightArg = "slon_object"[],
        function = "slon_relation_constructor"
      );
    `);
  });

  test('object', async () => {
    const { rows } = await pg.sql`select ('a' | 'b').*`;
    expect(rows).toEqual([{ left: 'a', right: 'b' }]);
  });

  test('network', async () => {
    const {
      rows: [{ result }],
    } = await pg.sql`
      select to_json(
        ('A' | 'a') & array[
          ('B' | 'b'),
          ('C' | 'c')
        ]
      ) as result
    `;
    expect(result).toEqual({
      parent: { left: 'A', right: 'a' },
      children: [
        { left: 'B', right: 'b' },
        { left: 'C', right: 'c' },
      ],
    });
  });
});
