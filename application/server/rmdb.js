// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import * as o_path from "node:path";

// `deno task rmdb` — delete the sqlite database (and its wal/shm sidecars).
// resolved from this module's location so it works regardless of cwd.
let S_PATH__DATA__DIR = o_path.resolve(import.meta.dirname, "..", "data");
let a_s_path__db = ["app.db", "app.db-wal", "app.db-shm"].map(function (s_name) {
  return o_path.resolve(S_PATH__DATA__DIR, s_name);
});
for (let s_path of a_s_path__db) {
  try {
    Deno.removeSync(s_path);
    console.log(`removed ${s_path}`);
  } catch (_) {
    // ignore if the file does not exist
  }
}
console.log("database cleaned");
