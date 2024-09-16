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


--------------------------------------------------------------------------------
-- SLON Object
--------------------------------------------------------------------------------
create type "slon_object" as (
  "left" text,
  "right" text
);

create function "slon_object_constructor" (text, text) returns "slon_object" as $$
  select row(("slon_symbol_constructor"($1))."id", ("slon_symbol_constructor"($2))."id")::"slon_object";
$$ language sql immutable;

create function "slon_object_constructor" ("slon_symbol", "slon_symbol") returns "slon_object" as $$
  select row((($1))."id", (($2))."id")::"slon_object";
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

