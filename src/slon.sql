--------------------------------------------------------------------------------
-- SLON Symbol
--------------------------------------------------------------------------------
create table "slon_symbol" (
  "id" text not null primary key,
  "index" serial
);

create function "slon_symbol_constructor" (text)
  returns "slon_symbol"
  returns null on null input
as $$
  insert into "slon_symbol" ("id") values ($1)
    on conflict ("id") do update set "id" = "excluded"."id"
    returning *
$$ language sql volatile;

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
create table "slon_object" (
  "left" "slon_symbol",
  "right" "slon_symbol",
  "id" text primary key generated always as (("left")."id" || ' | ' || ("right")."id") stored,
  "index" serial
);

create function "slon_object_constructor" ("slon_symbol", "slon_symbol")
  returns "slon_object"
  returns null on null input
as $$
  insert into "slon_object" ("left", "right") values ($1, $2)
    on conflict ("id")
      do update set "left" = "excluded"."left", "right" = "excluded"."right"
    returning *
$$ language sql volatile;

create function "slon_object_constructor" (text, text)
  returns "slon_object"
  returns null on null input
as $$
  select "slon_object_constructor" (@$1, @$2)
$$ language sql volatile;

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
  select $1."left" = $2."left" and $1."right" = $2."right"
$$ language sql immutable;

create operator = (
  leftArg = "slon_object",
  rightArg = "slon_object",
  function = "slon_object_equality"
);


--------------------------------------------------------------------------------
-- SLON Node
--------------------------------------------------------------------------------
create table "slon_node" (
  "effect" "slon_object" not null,
  "payload" "slon_object",
  "id" text primary key generated always as (("effect")."id" || ' & ' || coalesce(("payload")."id", 'null')) stored,
  "index" serial
);

create function "slon_node_constructor" ("slon_object")
  returns "slon_node"
  returns null on null input
as $$
  insert into "slon_node" ("effect") values ($1)
    on conflict ("id")
      do update set "effect" = "excluded"."effect"
    returning *
$$ language sql volatile;

create function "slon_node_constructor" ("slon_object", "slon_object")
  returns "slon_node"
  returns null on null input
as $$
  insert into "slon_node" ("effect", "payload") values ($1, $2)
    on conflict ("id")
      do update set "effect" = "excluded"."effect", "payload" = "excluded"."payload"
    returning *
$$ language sql volatile;

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
  select $1."effect" = $2."effect" and $1."payload" = $2."payload"
$$ language sql immutable;

create operator = (
  leftArg = "slon_node",
  rightArg = "slon_node",
  function = "slon_node_equality"
);
