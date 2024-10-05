import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, test } from "@jest/globals";
import { definition } from "./index.js";

describe("SLON – Semantically-Loose Object Network", () => {
  const pg = new PGlite();
  beforeAll(async () => pg.exec(definition));
  afterAll(() => pg.close());

  test("idempotence", async () => {
    await pg.exec(definition);
  });

  test("symbol", async () => {
    add_some_symbols: {
      const { rows } = await pg.sql`select to_json(@'A') as "result"`;
      expect(rows).toEqual([{ result: { id: "A" } }]);
    }

    symbol_equals_same_symbol: {
      const { rows } = await pg.sql`select @'A' = @'A' as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    symbol_does_not_equal_different_symbol: {
      const { rows } = await pg.sql`select @'A' = @'a' as "result"`;
      expect(rows).toEqual([{ result: false }]);
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

  test("object", async () => {
    object_is_a_pair_of_symbols: {
      const { rows } = await pg.sql`select to_json(@'A' | @'a') as "result"`;
      expect(rows).toEqual([
        {
          result: {
            id: "A | a",
            left: { id: "A" },
            right: { id: "a" },
          },
        },
      ]);
    }

    for_simplicity_symbol_sign_is_not_necessary: {
      const { rows } = await pg.sql`select to_json('A' | 'a') as "result"`;
      expect(rows).toEqual([
        {
          result: {
            id: "A | a",
            left: { id: "A" },
            right: { id: "a" },
          },
        },
      ]);
    }

    object_equals_same_object: {
      const { rows } = await pg.sql`select (@'A' | @'a') = ('A' | 'a') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    object_does_not_equal_different_object: {
      const { rows } = await pg.sql`select (@'A' | @'a') = ('a' | 'A') as "result"`;
      expect(rows).toEqual([{ result: false }]);
    }

    special_symbol_any_can_be_used_for_pattern_matching: {
      const { rows } = await pg.sql`select ('A' | '*') = ('A' | 'a') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    special_symbol_any_can_be_used_for_pattern_matching: {
      const { rows } = await pg.sql`select ('A' | '*') = ('B' | 'b') as "result"`;
      expect(rows).toEqual([{ result: false }]);
    }

    special_symbol_any_can_be_used_for_pattern_matching: {
      const { rows } = await pg.sql`select ('A' | '*') = ('*' | 'a') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }
  });

  test("node", async () => {
    node_is_a_pair_of_objects: {
      const { rows } = await pg.sql`select to_json(('A' | 'a') & ('B' | 'b')) as "result"`;
      expect(rows).toEqual([
        {
          result: {
            id: "A | a & B | b",
            effect: { id: "A | a", left: { id: "A" }, right: { id: "a" } },
            payload: { id: "B | b", left: { id: "B" }, right: { id: "b" } },
          },
        },
      ]);
    }

    or_node_is_just_a_single_object_without_payload: {
      const { rows } = await pg.sql`select to_json(&('A' | 'a')) as "result"`;
      expect(rows).toEqual([
        {
          result: {
            id: "A | a",
            effect: expect.objectContaining({ id: "A | a" }),
            payload: null,
          },
        },
      ]);
    }

    nodes_can_be_used_for_pattern_matching: {
      const { rows } =
        await pg.sql`select ('A' | 'a') & ('B' | 'b') = ('A' | 'a') & ('B' | 'b') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }

    nodes_can_be_used_for_pattern_matching: {
      const { rows } =
        await pg.sql`select ('A' | 'a') & ('B' | 'b') = ('B' | 'b') & ('A' | 'a') as "result"`;
      expect(rows).toEqual([{ result: false }]);
    }

    nodes_can_be_used_for_pattern_matching: {
      const { rows } =
        await pg.sql`select ('A' | 'a') & ('B' | 'b') = ('A' | 'a') & ('*' | 'b') as "result"`;
      expect(rows).toEqual([{ result: true }]);
    }
  });

  test("network", async () => {
    await pg.sql`
      select
        + ('program' | 'A')
          + (('*' | '*') & ('js' | '() => {}'))
      union
      select
        + ('trace' | 'A')
          + array[
            ('handle' | 'init'),
            ('bypass' | 'next') & ('json' | '{}')
          ]
    `;

    querying_starts_from_the_top_level_of_tree: {
      const { rows } = await pg.sql`select (? ('*' | '*'))."id"`;
      expect(rows).toEqual([{ id: "1. program | A" }, { id: "3. trace | A" }]);
    }

    query_for_any_program: {
      const { rows } = await pg.sql`select (? ('program' | '*'))."id"`;
      expect(rows).toEqual([{ id: "1. program | A" }]);
    }

    query_for_steps_of_all_traces_of_any_program: {
      const { rows } = await pg.sql`select (? ('trace' | ? ('program' | '*')) ? ('*' | '*'))."id"`;
      expect(rows).toEqual([{ id: "4. handle | init" }, { id: "5. bypass | next & json | {}" }]);
    }

    alternative_syntax_for_querying: {
      const { rows } = await pg.sql`
        select
            "~program"."id" as "programId",
            "~trace"."id" as "traceId",
            "~step"."id" as "stepId"
          from
            "slon_query"('program' | '*') as "~program",
            "slon_query"('trace' | "~program") as "~trace",
            "slon_query"("~trace", '*' | '*') as "~step"
          order by "~step"."index"
      `;
      expect(rows).toEqual([
        {
          programId: "1. program | A",
          traceId: "3. trace | A",
          stepId: "4. handle | init",
        },
        {
          programId: "1. program | A",
          traceId: "3. trace | A",
          stepId: "5. bypass | next & json | {}",
        },
      ]);
    }

    deleting_transitions_from_program: {
      const { rows } = await pg.sql`select (- (? ('program' | 'A') ? ('*' | '*')))."id"`;
      expect(rows).toEqual([{ id: "2. * | * & js | () => {}" }]);
    }

    there_should_be_no_transitions_left: {
      const { rows } = await pg.sql`select (? ('program' | 'A') ? ('*' | '*'))."id"`;
      expect(rows).toEqual([]);
    }

    appending_transition_to_program: {
      await pg.sql`
        select
          (? ('program' | 'A'))
            + (('@' | 'init') & ('js' | '() => {}'))
      `;
      const { rows } = await pg.sql`select (? ('program' | 'A') ? ('*' | '*'))."id"`;
      expect(rows).toEqual([{ id: "6. @ | init & js | () => {}" }]);
    }

    delete_everything: {
      await pg.sql`select - ('*' | '*')`;
      const { rows } = await pg.sql`select * from "slon"`;
      expect(rows).toEqual([]);
    }
  });

  describe("use cases", () => {
    test("simplified pg schema navigation", async () => {
      await pg.sql`
        create table "User" (
          "name" text not null,
          "email" text not null,
          "bio" text,
          "etag" text not null generated always as (md5("name" || "email" || "bio")) stored
        );
      `;

      await pg.sql`
        with
          "~table" as (
            insert into "slon" ("node")
              select ('table' | pg_class.relName) & ('oid' | pg_class.oid::text)
                from pg_class
                where relKind = 'r'
                  and relNamespace = 'public'::regNamespace
              returning *
          ),
          "~column" as (
            insert into "slon" ("node", "related_to")
              select ('column' | pg_attribute.attName) & ('number' | pg_attribute.attNum::text), "~table"."id"
                from "~table"
                  inner join pg_attribute
                    on ((("~table"."node")."payload")."right")."id" = pg_attribute.attRelId::text
                where pg_attribute.attNum > 0
              returning *
          ),
          "~notNull" as (
            insert into "slon" ("node", "related_to")
              select &('not null' | pg_attribute.attNotNull::text), "~column"."id"
                from "~column"
                  inner join "~table"
                    on "~table"."id" = "~column"."related_to"
                  inner join pg_attribute
                    on ((("~column"."node")."payload")."right")."id" = pg_attribute.attNum::text
                      and ((("~table"."node")."payload")."right")."id" = pg_attribute.attRelId::text
              returning *
          ),
          "~generated" as (
            insert into "slon" ("node", "related_to")
              select &('generated' | case when pg_attribute.attGenerated = 's' then 'always' else 'never' end), "~column"."id"
                from "~column"
                  inner join "~table"
                    on "~table"."id" = "~column"."related_to"
                  inner join pg_attribute
                    on ((("~column"."node")."payload")."right")."id" = pg_attribute.attNum::text
                      and ((("~table"."node")."payload")."right")."id" = pg_attribute.attRelId::text
              returning *
          )
        select * from "~table", "~column", "~notNull", "~generated"
      `;

      all_columns_of_table_slon: {
        const { rows } = await pg.sql`
          select ((
            ? ('table' | 'User') ? ('column' | '*')
          )."node")."id"
        `;
        expect(rows).toEqual([
          { id: "column | name & number | 1" },
          { id: "column | email & number | 2" },
          { id: "column | bio & number | 3" },
          { id: "column | etag & number | 4" },
        ]);
      }

      all_columns_that_are_not_null: {
        const { rows } = await pg.sql`
          select ("~column"."node")."id"
            from
              "slon_query"('table' | 'User') as "~table",
              "slon_query"("~table", 'column' | '*') as "~column",
              "slon_query"("~column", 'not null' | 'true') as "~notNull"
            order by "~column"."index"
        `;
        expect(rows).toEqual([
          { id: "column | name & number | 1" },
          { id: "column | email & number | 2" },
          { id: "column | etag & number | 4" },
        ]);
      }

      all_columns_that_are_not_null_and_not_generated: {
        const { rows } = await pg.sql`
          select ("~column"."node")."id"
            from
              "slon_query"('table' | 'User') as "~table",
              "slon_query"("~table", 'column' | '*') as "~column",
              "slon_query"("~column", 'not null' | 'true') as "~notNull",
              "slon_query"("~column", 'generated' | 'never') as "~generated"
            order by "~column"."index"
        `;
        expect(rows).toEqual([
          { id: "column | name & number | 1" },
          { id: "column | email & number | 2" },
        ]);
      }
    });
  });
});
