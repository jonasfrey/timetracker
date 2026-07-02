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

// server-side sorting + per-activity completed-time sum (browser is a pure renderer).
// n_ms__sum counts only closed tracks (n_ts_ms_end not null) — the running track is
// excluded, so the sum visibly updates only when tracking is paused/stopped.
// s_sort: "created" (insertion order, default) | "name" | "last_tracked"
let f_a_o_activity__by_workspace = function (n_o_workspace_n_id, s_sort) {
  let o_db = f_o_db();
  let s_order;
  if (s_sort == "name") {
    s_order = "s_name COLLATE NOCASE ASC";
  } else if (s_sort == "last_tracked") {
    s_order = "(n_ts_ms__last IS NULL), n_ts_ms__last DESC, n_ts_ms__created DESC";
  } else {
    s_order = "n_ts_ms__created ASC";
  }
  return o_db
    .prepare(
      `SELECT o_activity.*,
         COALESCE((SELECT SUM(o_timertrack.n_ts_ms_end - o_timertrack.n_ts_ms_start)
                     FROM o_timertrack
                    WHERE o_timertrack.n_o_activity_n_id = o_activity.n_id
                      AND o_timertrack.n_ts_ms_end IS NOT NULL), 0) AS n_ms__sum,
         (SELECT MAX(o_timertrack.n_ts_ms_start)
            FROM o_timertrack
           WHERE o_timertrack.n_o_activity_n_id = o_activity.n_id) AS n_ts_ms__last
         FROM o_activity
        WHERE o_activity.n_o_workspace_n_id = ?
        ORDER BY ${s_order}`,
    )
    .all(n_o_workspace_n_id);
};

export { f_o_activity__create, f_o_activity__update, f_o_activity__delete, f_a_o_activity__by_workspace, f_o_activity__by_n_id };
