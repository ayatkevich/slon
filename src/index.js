import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const dirname = fileURLToPath(new URL(".", import.meta.url));

export const definitionPath = path.join(dirname, "slon.sql");

export const definition = await readFile(definitionPath, "utf8");
