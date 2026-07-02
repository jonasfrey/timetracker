// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_o_db } from "../db.js";

let f_o_activity__by_n_id = function (n_id) {
  let o_db = f_o_db();
  return o_db.prepare("SELECT * FROM o_activity WHERE n_id = ?").get(n_id) || null;
};

let f_o_activity__create = function (n_o_workspace_n_id, s_name) {
  let o_db = f_o_db();
  let n_ms = Date.now();
  let o_res = o_db
    .prepare("INSERT INTO o_activity (n_o_workspace_n_id, s_name, n_ts_ms__created, n_ts_ms__updated) VALUES (?, ?, ?, ?)")
    .run(n_o_workspace_n_id, s_name, n_ms, n_ms);
  return f_o_activity__by_n_id(Number(o_res.lastInsertRowid));
};

let f_o_activity__update = function (n_id, s_name) {
  let o_db = f_o_db();
  let n_ms = Date.now();
  o_db
    .prepare("UPDATE o_activity SET s_name = ?, n_ts_ms__updated = ? WHERE n_id = ?")
    .run(s_name, n_ms, n_id);
  return f_o_activity__by_n_id(n_id);
};

let f_o_activity__delete = function (n_id) {
  let o_db = f_o_db();
  o_db.prepare("DELETE FROM o_activity WHERE n_id = ?").run(n_id);
};

// server-side sorting (browser is a pure renderer): "name" | "last_tracked"
let f_a_o_activity__by_workspace = function (n_o_workspace_n_id, s_sort) {
  let o_db = f_o_db();
  let a_o_activity;
  if (s_sort == "name") {
    a_o_activity = o_db
      .prepare("SELECT * FROM o_activity WHERE n_o_workspace_n_id = ? ORDER BY s_name COLLATE NOCASE ASC")
      .all(n_o_workspace_n_id);
  } else {
    // last_tracked: most recent timertrack start first; never-tracked fall back to created time
    a_o_activity = o_db
      .prepare(
        `SELECT o_activity.*,
           (SELECT MAX(o_timertrack.n_ts_ms_start)
              FROM o_timertrack
             WHERE o_timertrack.n_o_activity_n_id = o_activity.n_id) AS n_ts_ms__last
           FROM o_activity
          WHERE o_activity.n_o_workspace_n_id = ?
          ORDER BY (n_ts_ms__last IS NULL), n_ts_ms__last DESC, o_activity.n_ts_ms__created DESC`,
      )
      .all(n_o_workspace_n_id);
  }
  return a_o_activity;
};

export { f_o_activity__create, f_o_activity__update, f_o_activity__delete, f_a_o_activity__by_workspace, f_o_activity__by_n_id };
