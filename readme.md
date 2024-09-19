# SLON – Semantically-Loose Object Network

## Introduction

SLON (Semantically-Loose Object Network) is an experimental data structure implemented in PostgreSQL. It provides a flexible and dynamic way to model relationships between objects using custom PostgreSQL types, operators, and functions. SLON is designed to facilitate complex queries and pattern matching over a network of interconnected nodes, making it suitable for representing hierarchical or graph-based data within a relational database.

## Installation

To use SLON, you need to execute the provided SQL script (`slon.sql`) in your PostgreSQL database. This script defines the custom types, functions, operators, and the main `slon` table that constitute the SLON data structure.

```sql
-- Execute the SLON SQL script
\i slon.sql
```

## Concepts

### Symbols

A **Symbol** is the basic unit in SLON, identified by a text `id`. Symbols can be constructed using the `@` operator.

**Creation:**

```sql
-- Create a symbol
SELECT @'A' AS symbol;
```

**Special Symbol:**

- `'*'`: A wildcard symbol that matches any symbol during equality checks.

**Equality:**

Two symbols are considered equal if:

- Their `id`s are equal, or
- Either symbol is the wildcard `'*'`.

**Example:**

```sql
-- Symbols equality
SELECT @'A' = @'A' AS result;  -- true
SELECT @'A' = @'B' AS result;  -- false
SELECT @'A' = @'*' AS result;  -- true
```

### Objects

An **Object** in SLON is a pair of symbols: a `left` symbol and a `right` symbol. Objects can represent relationships or properties.

**Construction:**

```sql
-- Create an object from two symbols
SELECT @'A' | @'a' AS object;

-- Simplified syntax without '@' operator
SELECT 'A' | 'a' AS object;
```

**Equality:**

Objects are equal if:

- Both their `left` symbols are equal, and
- Both their `right` symbols are equal.

**Pattern Matching with Wildcards:**

```sql
-- Object equality with wildcard
SELECT ('A' | '*') = ('A' | 'a') AS result;  -- true
SELECT ('*' | '*') = ('B' | 'b') AS result;  -- true
SELECT ('A' | '*') = ('B' | 'b') AS result;  -- false
```

### Nodes

A **Node** is an object that may optionally have a payload (another object). Nodes represent entities with potential additional data.

**Construction:**

```sql
-- Create a node with an effect and a payload
SELECT ('A' | 'a') & ('B' | 'b') AS node;

-- Create a node with only an effect
SELECT &('A' | 'a') AS node;
```

**Equality:**

Nodes are equal if:

- Their effects are equal, and
- Their payloads are equal, or
- One of the effects is `'* | *'` and the payload is `NULL`.

**Example:**

```sql
-- Nodes equality
SELECT ('A' | 'a') & ('B' | 'b') = ('A' | 'a') & ('B' | 'b') AS result;  -- true
SELECT ('A' | 'a') & ('B' | 'b') = ('A' | 'a') & ('*' | 'b') AS result;  -- true
SELECT ('A' | 'a') & ('B' | 'b') = ('B' | 'b') & ('A' | 'a') AS result;  -- false
```

### The Network (SLON Table)

The **Network** is represented by the `slon` table, which stores nodes and their relationships.

**Table Structure:**

```sql
CREATE TABLE "slon" (
  "node" "slon_node" NOT NULL,
  "related_to" TEXT REFERENCES "slon" ("id") ON DELETE CASCADE,
  "index" SERIAL,
  "id" TEXT PRIMARY KEY GENERATED ALWAYS AS ("index" || '. ' || ("node")."id") STORED
);
```

**Inserting Nodes:**

- **Top-Level Node:**

  ```sql
  INSERT INTO "slon" ("node") VALUES (&('program' | 'A'));
  ```

- **Related Node:**

  ```sql
  INSERT INTO "slon" ("node", "related_to")
  VALUES (&('trace' | 'A'), '1. program | A');
  ```

## Usage

### Building the Network

**Example:**

```sql
-- Insert a program node
WITH program AS (
  INSERT INTO "slon" ("node")
  VALUES (&('program' | 'A'))
  RETURNING id
)
-- Insert a trace node related to the program
INSERT INTO "slon" ("node", "related_to")
VALUES (&('trace' | 'A'), (SELECT id FROM program));
```

### Querying the Network

SLON provides custom operators and functions to query nodes and their relationships.

**Basic Queries:**

```sql
-- Query top-level nodes
SELECT (? ('*' | '*')).id FROM "slon";

-- Query nodes matching a specific pattern
SELECT (? ('program' | '*')).id FROM "slon";
```

**Chained Queries:**

```sql
-- Query steps of all traces of any program
SELECT (? ('trace' | ? ('program' | '*')) ? ('*' | '*')).id FROM "slon";
```

**Alternative Syntax:**

```sql
SELECT
  program.id AS programId,
  trace.id AS traceId,
  step.id AS stepId
FROM
  slon_query('program' | '*') AS program,
  slon_query('trace' | program) AS trace,
  slon_query(trace, '*' | '*') AS step
ORDER BY step.index;
```

### Pattern Matching with Wildcards

Wildcards allow for flexible pattern matching within queries.

**Example:**

```sql
-- Query nodes where the left symbol is 'A' and any right symbol
SELECT (? ('A' | '*')).id FROM "slon";
```

## Use Cases

### Simplified PostgreSQL Schema Navigation

SLON can simplify navigating and querying the PostgreSQL schema.

**Inserting Tables and Columns into SLON:**

```sql
WITH
  tables AS (
    INSERT INTO "slon" ("node")
    SELECT ('table' | pg_class.relname) & ('oid' | pg_class.oid::text)
    FROM pg_class
    WHERE relkind = 'r' AND relnamespace = 'public'::regnamespace
    RETURNING id
  ),
  columns AS (
    INSERT INTO "slon" ("node", "related_to")
    SELECT &('column' | pg_attribute.attname), tables.id
    FROM tables
    JOIN pg_attribute ON (tables.node).payload.right.id = pg_attribute.attrelid::text
    WHERE pg_attribute.attnum > 0
    RETURNING id
  )
SELECT * FROM tables, columns;
```

**Querying Columns of a Specific Table:**

```sql
-- Get all columns of the 'slon' table
SELECT ((? ('table' | 'slon') ? ('column' | '*')).node).id FROM "slon";
```

**Result:**

```text
column | node
column | related_to
column | index
column | id
```

## Testing

The provided test suite (`specification tests`) demonstrates various use cases and validates the behavior of the SLON data structure.

**Example Test Cases:**

- **Symbol Equality:**

  ```sql
  SELECT @'A' = @'A' AS result;  -- true
  SELECT @'A' = @'*' AS result;  -- true
  SELECT @'A' = @'B' AS result;  -- false
  ```

- **Object Equality:**

  ```sql
  SELECT (@'A' | @'a') = ('A' | 'a') AS result;  -- true
  SELECT ('A' | '*') = ('A' | 'a') AS result;    -- true
  SELECT ('A' | '*') = ('B' | 'b') AS result;    -- false
  ```

- **Node Equality:**

  ```sql
  SELECT ('A' | 'a') & ('B' | 'b') = ('A' | 'a') & ('B' | 'b') AS result;  -- true
  SELECT ('A' | 'a') & ('B' | 'b') = ('B' | 'b') & ('A' | 'a') AS result;  -- false
  SELECT ('A' | 'a') & ('B' | 'b') = ('A' | 'a') & ('*' | 'b') AS result;  -- true
  ```

## License

This project is licensed under the MIT License.
