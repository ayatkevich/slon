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
  "index" int,
  "parent" int,
  "object" "slon_object"
);

create function "slon_relation_constructor" ("slon_object", "slon_object"[]) returns setof "slon_relation" as $$
  select *
    from (
      select row(1, null, $1)::"slon_relation" as "~relation"
      union
      select row(row_number() over () + 1, 1, "~2")::"slon_relation" as "~relation"
        from unnest($2) as "~2"
    )
    order by ("~relation")."index"
$$ language sql immutable;

create function "slon_relation_constructor" ("slon_object", "slon_relation"[]) returns setof "slon_relation" as $$
  select distinct on (("~relation")."index") "~relation"
    from (
      select row(1, null, $1)::"slon_relation" as "~relation"
      union
      select row(("~2")."index" + 1, coalesce(("~2")."parent" + 1, 1), ("~2")."object")::"slon_relation" as "~relation"
        from unnest($2) as "~2"
    )
    order by ("~relation")."index"
$$ language sql immutable;

create operator & (
  leftArg = "slon_object",
  rightArg = "slon_object"[],
  function = "slon_relation_constructor"
);

create operator & (
  leftArg = "slon_object",
  rightArg = "slon_relation"[],
  function = "slon_relation_constructor"
);

create function "slon_search" ("~set" "slon_relation", "?" "slon_object") returns "slon_relation" as $$
  select *
    from (select "~set".*) as "~"
    where "~"."object" = "?"
$$ language sql immutable;

create operator ? (
  leftArg = "slon_relation",
  rightArg = "slon_object",
  function = "slon_search"
);
