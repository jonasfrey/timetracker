// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { DatabaseSync } from "node:sqlite";
import * as o_path from "node:path";

// one module-level handle, never opened/closed per request (DatabaseSync can be
// closed by the GC if it goes out of scope — deno issue #31732).
let o_db = null;

let S_SQL__DDL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS o_workspace (
  n_id              INTEGER PRIMARY KEY,
  s_uuid            TEXT    NOT NULL UNIQUE,
  n_ts_ms__created  INTEGER NOT NULL,
  n_ts_ms__updated  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS o_activity (
  n_id                INTEGER PRIMARY KEY,
  n_o_workspace_n_id  INTEGER NOT NULL REFERENCES o_workspace(n_id) ON DELETE CASCADE,
  s_name              TEXT    NOT NULL,
  n_ts_ms__created    INTEGER NOT NULL,
  n_ts_ms__updated    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS o_activity__ws_idx ON o_activity(n_o_workspace_n_id);

CREATE TABLE IF NOT EXISTS o_timertrack (
  n_id                INTEGER PRIMARY KEY,
  n_o_workspace_n_id  INTEGER NOT NULL REFERENCES o_workspace(n_id) ON DELETE CASCADE,
  n_o_activity_n_id   INTEGER NOT NULL REFERENCES o_activity(n_id)  ON DELETE CASCADE,
  n_ts_ms_start       INTEGER NOT NULL,
  n_ts_ms_end         INTEGER,
  s_notes             TEXT    NOT NULL DEFAULT '',
  n_ts_ms__created    INTEGER NOT NULL,
  n_ts_ms__updated    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS o_timertrack__running_idx ON o_timertrack(n_o_workspace_n_id) WHERE n_ts_ms_end IS NULL;
CREATE INDEX IF NOT EXISTS o_timertrack__range_idx   ON o_timertrack(n_o_workspace_n_id, n_ts_ms_start);

CREATE TABLE IF NOT EXISTS o_key_val (
  n_id                INTEGER PRIMARY KEY,
  n_o_workspace_n_id  INTEGER NOT NULL REFERENCES o_workspace(n_id) ON DELETE CASCADE,
  s_key               TEXT    NOT NULL,
  s_value__json       TEXT    NOT NULL,
  n_ts_ms__updated    INTEGER NOT NULL,
  UNIQUE(n_o_workspace_n_id, s_key)
);
`;

let f_init__schema = function (o_db) {
  o_db.exec("PRAGMA journal_mode = WAL;");
  o_db.exec("PRAGMA foreign_keys = ON;");
  let a_s_stmt = S_SQL__DDL
    .split(";")
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.length > 0 && !/^PRAGMA/i.test(s); });
  for (let s_stmt of a_s_stmt) {
    o_db.exec(s_stmt + ";");
  }
};

// returns the singleton DatabaseSync, opening + applying schema on first call.
// s_path__db optional override (used by tests); default = <app>/data/app.db,
// resolved from this module's location so it works regardless of cwd.
let f_o_db = function (s_path__db) {
  if (o_db) { return o_db; }
  if (!s_path__db) {
    s_path__db = o_path.resolve(import.meta.dirname, "..", "data", "app.db");
  }
  try { Deno.mkdirSync(o_path.dirname(s_path__db), { recursive: true }); } catch (_) {}
  o_db = new DatabaseSync(s_path__db);
  f_init__schema(o_db);
  return o_db;
};

export { f_o_db, f_init__schema };
