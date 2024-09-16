# SLON: Semantically-Loose Object Network

SLON (Semantically-Loose Object Network) is a flexible data structure implemented as a PostgreSQL extension. It represents a tree of pairs of pairs, allowing for dynamic and pattern-matching capabilities through custom operators and functions. This document provides an overview of SLON's components, their interactions, and how to utilize them effectively.

## Table of Contents

- [SLON: Semantically-Loose Object Network](#slon-semantically-loose-object-network)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Components](#components)
    - [SLON Symbol](#slon-symbol)
    - [SLON Object](#slon-object)
    - [SLON Node](#slon-node)
    - [SLON Tree](#slon-tree)
  - [Operators and Functions](#operators-and-functions)
    - [Symbol Constructor `@`](#symbol-constructor-)
    - [Object Constructor `|`](#object-constructor-)
    - [Node Constructor `&`](#node-constructor-)
    - [Query Operator `?`](#query-operator-)
  - [Special Symbols](#special-symbols)
  - [Usage Examples](#usage-examples)
    - [Creating Symbols](#creating-symbols)
    - [Creating Objects](#creating-objects)
    - [Creating Nodes](#creating-nodes)
    - [Building a Tree](#building-a-tree)
    - [Querying the Tree](#querying-the-tree)
    - [Alternative Query Syntax](#alternative-query-syntax)
  - [Pattern Matching](#pattern-matching)
  - [Installation](#installation)
  - [Contributing](#contributing)
  - [License](#license)

## Overview

SLON is designed to represent complex relationships and hierarchies using a tree structure composed of symbols, objects, and nodes. It provides custom operators for constructing and querying the data, enabling pattern matching and flexible data manipulation.

## Components

### SLON Symbol

A **SLON Symbol** is the most basic unit in SLON. It represents a unique identifier (string) used within objects and nodes.

- **Table**: `slon_symbol`
- **Columns**:
  - `id`: Text (primary key)
  - `index`: Serial number (auto-incremented)

### SLON Object

A **SLON Object** is a pair of symbols, consisting of a left and a right symbol.

- **Table**: `slon_object`
- **Columns**:
  - `left`: `slon_symbol` (not null)
  - `right`: `slon_symbol` (not null)
  - `id`: Text (generated as `left.id || ' | ' || right.id`)
  - `index`: Serial number

### SLON Node

A **SLON Node** combines an effect and an optional payload, both of which are SLON Objects.

- **Table**: `slon_node`
- **Columns**:
  - `effect`: `slon_object` (not null)
  - `payload`: `slon_object` (nullable)
  - `id`: Text (generated as `effect.id || ' & ' || COALESCE(payload.id, 'null')`)
  - `index`: Serial number

### SLON Tree

A **SLON Tree** organizes nodes into a hierarchical structure with parent-child relationships.

- **Table**: `slon_tree`
- **Columns**:
  - `node`: `slon_node` (not null)
  - `parent`: Text (references `slon_tree.id`, nullable)
  - `id`: Text (generated as `index || '. ' || node.id`)
  - `index`: Serial number

## Operators and Functions

SLON introduces custom operators and functions to simplify the creation and manipulation of its components.

### Symbol Constructor `@`

- **Usage**: `@'symbol_id'`
- **Description**: Constructs or retrieves a `slon_symbol` with the given `id`.
- **Example**: `@'A'` creates or retrieves a symbol with `id` = `'A'`.

### Object Constructor `|`

- **Usage**: `left_symbol | right_symbol`
- **Description**: Constructs or retrieves a `slon_object` from two symbols.
- **Example**: `@'A' | @'a'` creates an object with `left` = `'A'` and `right` = `'a'`.

### Node Constructor `&`

- **Usage**:
  - `& object` (without payload)
  - `effect_object & payload_object` (with payload)
- **Description**: Constructs or retrieves a `slon_node` from one or two objects.
- **Example**:
  - `& ('A' | 'a')` creates a node with `effect` = `('A' | 'a')` and no `payload`.
  - `('A' | 'a') & ('B' | 'b')` creates a node with both `effect` and `payload`.

### Query Operator `?`

- **Usage**:
  - `? node_or_object`
  - `parent_tree ? node_or_object`
- **Description**: Queries the `slon_tree` for nodes matching the given criteria.
- **Example**:
  - `? ('program' | '*')` retrieves top-level nodes with `effect.left` = `'program'`.
  - `parent_tree ? ('*' | '*')` retrieves child nodes under `parent_tree`.

## Special Symbols

The symbol `'*'` is a wildcard used for pattern matching. In equality comparisons:

- Any symbol equals `'*'`.
- `'*'` equals any symbol.
- Useful for querying and pattern matching within the tree.

## Usage Examples

### Creating Symbols

```sql
SELECT to_json(@'A') AS result;
-- Result: { "id": "A", "index": 1 }
```

### Creating Objects

```sql
SELECT to_json('A' | 'a') AS result;
-- Result: { "id": "A | a", "index": 1, "left": { "id": "A" }, "right": { "id": "a" } }
```

### Creating Nodes

```sql
-- Node with effect only
SELECT to_json(& ('A' | 'a')) AS result;
-- Result: { "id": "A | a & null", "index": 1, "effect": { ... }, "payload": null }

-- Node with effect and payload
SELECT to_json(('A' | 'a') & ('B' | 'b')) AS result;
-- Result: { "id": "A | a & B | b", "index": 2, "effect": { ... }, "payload": { ... } }
```

### Building a Tree

```sql
-- Insert root node
INSERT INTO slon_tree (node, parent)
VALUES (& ('program' | 'A'), NULL);

-- Insert child node
INSERT INTO slon_tree (node, parent)
VALUES (('*' | '*') & ('js' | '() => {}'), '1. program | A & null');
```

### Querying the Tree

```sql
-- Retrieve top-level nodes
SELECT (? ('*' | '*')).id;
-- Returns nodes with any effect.

-- Query for specific program nodes
SELECT (? ('program' | '*')).id;
-- Returns nodes where effect.left = 'program'.

-- Query child nodes under 'trace' nodes
SELECT (? ('trace' | ? ('program' | '*')) ? ('*' | '*')).id;
-- Retrieves steps of all traces under any program.
```

### Alternative Query Syntax

```sql
SELECT
    program.id AS program_id,
    trace.id AS trace_id,
    step.id AS step_id
FROM
    slon_query(('program' | '*')) AS program,
    slon_query(('trace' | program)) AS trace,
    slon_query(trace, ('*' | '*')) AS step;
```

## Pattern Matching

SLON leverages the wildcard symbol `'*'` for flexible pattern matching:

- **Symbols**: `@'A' = @'*'` evaluates to `TRUE`.
- **Objects**: `('A' | '*') = ('A' | 'a')` evaluates to `TRUE`.
- **Nodes**: `('A' | 'a') & ('*' | 'b') = ('A' | 'a') & ('B' | 'b')` evaluates to `TRUE`.

This feature allows for querying and comparing components without specifying every detail.

## Installation

1. **Prerequisites**: Ensure PostgreSQL is installed.
2. **Execute SLON SQL Script**: Run the SLON SQL definition script in your database.

```bash
psql -U your_username -d your_database -f slon.sql
```

## Contributing

Contributions are welcome! Please submit issues or pull requests for enhancements or bug fixes.

## License

This project is licensed under the MIT License.
