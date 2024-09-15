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
  "child" "slon_object"
);

create function "slon_relation_constructor" ("slon_object", "slon_object"[]) returns setof "slon_relation" as $$
  select row($1, "~")::"slon_relation"
    from unnest($2) as "~";
$$ language sql immutable;

create operator & (
  leftArg = "slon_object",
  rightArg = "slon_object"[],
  function = "slon_relation_constructor"
);
