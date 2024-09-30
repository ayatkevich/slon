import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const dirname = fileURLToPath(new URL(".", import.meta.url));

export const definition = await readFile(path.join(dirname, "slon.sql"), "utf8");
