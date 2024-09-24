--------------------------------------------------------------------------------
-- SLON Symbol
--------------------------------------------------------------------------------
create type "slon_symbol" as (
  "id" text
);

create function "slon_symbol_constructor" (text)
  returns "slon_symbol"
  returns null on null input
as $$
  select row ($1)::"slon_symbol"
$$ language sql immutable;

create operator @ (
  rightArg = text,
  function = "slon_symbol_constructor"
);

create function "slon_symbol_equality" ("slon_symbol", "slon_symbol")
  returns boolean
as $$
  select $1."id" = '*' or $2."id" = '*' or $1."id" = $2."id"
$$ language sql immutable;

create operator = (
  leftArg = "slon_symbol",
  rightArg = "slon_symbol",
  function = "slon_symbol_equality"
);


--------------------------------------------------------------------------------
-- SLON Object
--------------------------------------------------------------------------------
create type "slon_object" as (
  "left" "slon_symbol",
  "right" "slon_symbol",
  "id" text
);

create function "slon_object_constructor" ("slon_symbol", "slon_symbol")
  returns "slon_object"
  returns null on null input
as $$
  select row ($1, $2, $1."id" || ' | ' || $2."id")::"slon_object"
$$ language sql immutable;

create function "slon_object_constructor" (text, text)
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" (@$1, @$2)
$$ language sql immutable;

create operator | (
  leftArg = text,
  rightArg = text,
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon_symbol",
  rightArg = "slon_symbol",
  function = "slon_object_constructor"
);

create function "slon_object_equality" ("slon_object", "slon_object")
  returns boolean
as $$
  select $1."left" is not distinct from $2."left" and $1."right" is not distinct from $2."right"
$$ language sql immutable;

create operator = (
  leftArg = "slon_object",
  rightArg = "slon_object",
  function = "slon_object_equality"
);

create function "slon_object_constructor" ("slon_symbol", "slon_object")
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" ($1, $2."right")
$$ language sql immutable;

create function "slon_object_constructor" (text, "slon_object")
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" (@$1, $2)
$$ language sql immutable;

create function "slon_object_constructor" ("slon_object", "slon_symbol")
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" ($1."left", $2)
$$ language sql immutable;

create function "slon_object_constructor" ("slon_object", text)
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" ($1, @$2)
$$ language sql immutable;

create operator | (
  leftArg = text,
  rightArg = "slon_object",
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon_symbol",
  rightArg = "slon_object",
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon_object",
  rightArg = text,
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon_object",
  rightArg = "slon_symbol",
  function = "slon_object_constructor"
);


--------------------------------------------------------------------------------
-- SLON Node
--------------------------------------------------------------------------------
create type "slon_node" as (
  "effect" "slon_object",
  "payload" "slon_object",
  "id" text
);

create function "slon_node_constructor" ("slon_object")
  returns "slon_node"
  returns null on null input
as $$
  select row ($1, null, $1."id")::"slon_node"
$$ language sql immutable;

create function "slon_node_constructor" ("slon_object", "slon_object")
  returns "slon_node"
  returns null on null input
as $$
  select row ($1, $2, $1."id" || ' & ' || $2."id")::"slon_node"
$$ language sql immutable;

create operator & (
  rightArg = "slon_object",
  function = "slon_node_constructor"
);

create operator & (
  leftArg = "slon_object",
  rightArg = "slon_object",
  function = "slon_node_constructor"
);

create function "slon_node_equality" ("slon_node", "slon_node")
  returns boolean
as $$
  select case
    when ($1."effect")."id" = '* | *' and $1."payload" is null
      then true
    when ($2."effect")."id" = '* | *' and $2."payload" is null
      then true
    when $1."payload" is null or $2."payload" is null
      then $1."effect" is not distinct from $2."effect"
    else $1."effect" is not distinct from $2."effect"
      and $1."payload" is not distinct from $2."payload"
  end
$$ language sql immutable;

create operator = (
  leftArg = "slon_node",
  rightArg = "slon_node",
  function = "slon_node_equality"
);

create cast ("slon_object" as "slon_node")
  with function "slon_node_constructor" ("slon_object")
  as implicit;


--------------------------------------------------------------------------------
-- SLON Query
--------------------------------------------------------------------------------
create table "slon" (
  "node" "slon_node" not null,
  "related_to" text references "slon" ("id") on delete cascade,
  "index" serial,
  "id" text primary key generated always as ("index" || '. ' || ("node")."id") stored
);

create function "slon_query" ("slon_node")
  returns setof "slon"
as $$
  select * from "slon" where "node" = $1 and "related_to" is null
$$ language sql immutable;

create function "slon_query" ("slon", "slon_node")
  returns setof "slon"
as $$
  select * from "slon" where "node" = $2 and "related_to" = $1."id"
$$ language sql immutable;

create operator ? (
  rightArg = "slon_node",
  function = "slon_query"
);

create operator ? (
  leftArg = "slon",
  rightArg = "slon_node",
  function = "slon_query"
);

create function "slon_object_constructor" ("slon_symbol", "slon")
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" ($1, ($2."node")."effect")
$$ language sql immutable;

create function "slon_object_constructor" (text, "slon")
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" (@$1, $2)
$$ language sql immutable;

create function "slon_object_constructor" ("slon", "slon_symbol")
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" (($1."node")."effect", $2)
$$ language sql immutable;

create function "slon_object_constructor" ("slon", text)
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" ($1, @$2)
$$ language sql immutable;

create operator | (
  leftArg = text,
  rightArg = "slon",
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon_symbol",
  rightArg = "slon",
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon",
  rightArg = text,
  function = "slon_object_constructor"
);

create operator | (
  leftArg = "slon",
  rightArg = "slon_symbol",
  function = "slon_object_constructor"
);

create function "slon_append" ("slon_node")
  returns "slon"
  returns null on null input
as $$
  insert into "slon" ("node") values ($1) returning *
$$ language sql volatile;

create function "slon_append" ("slon", "slon_node")
  returns "slon"
  returns null on null input
as $$
  insert into "slon" ("related_to", "node") values ($1."id", $2) returning *
$$ language sql volatile;

create function "slon_append" ("slon", "slon_node"[])
  returns setof "slon"
  returns null on null input
as $$
  select "slon_append" ($1, unnest ($2))
$$ language sql volatile;

create operator + (
  rightArg = "slon_node",
  function = "slon_append"
);

create operator + (
  leftArg = "slon",
  rightArg = "slon_node",
  function = "slon_append"
);

create operator + (
  leftArg = "slon",
  rightArg = "slon_node"[],
  function = "slon_append"
);

create function "slon_delete" ("slon")
  returns void
  returns null on null input
as $$
  delete from "slon" where "id" = $1."id" returning *
$$ language sql volatile;

create operator - (
  rightArg = "slon",
  function = "slon_delete"
);
