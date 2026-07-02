// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_o_db } from "../db.js";

// general-purpose workspace settings / UI-state store (JSON values)
let f_o_key_val__get = function (n_o_workspace_n_id, s_key) {
  let o_db = f_o_db();
  let o_row = o_db
    .prepare("SELECT s_value__json FROM o_key_val WHERE n_o_workspace_n_id = ? AND s_key = ?")
    .get(n_o_workspace_n_id, s_key);
  if (!o_row) { return null; }
  try { return JSON.parse(o_row.s_value__json); } catch (_) { return null; }
};

let f_o_key_val__set = function (n_o_workspace_n_id, s_key, v_value) {
  let o_db = f_o_db();
  let n_ms = Date.now();
  let s_value__json = JSON.stringify(v_value);
  o_db
    .prepare(
      `INSERT INTO o_key_val (n_o_workspace_n_id, s_key, s_value__json, n_ts_ms__updated) VALUES (?, ?, ?, ?)
       ON CONFLICT(n_o_workspace_n_id, s_key) DO UPDATE SET s_value__json = excluded.s_value__json, n_ts_ms__updated = excluded.n_ts_ms__updated`,
    )
    .run(n_o_workspace_n_id, s_key, s_value__json, n_ms);
};

export { f_o_key_val__get, f_o_key_val__set };
