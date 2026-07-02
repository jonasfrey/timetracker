// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_o_db } from "../db.js";

let f_o_timertrack__by_n_id = function (n_id) {
  let o_db = f_o_db();
  return o_db.prepare("SELECT * FROM o_timertrack WHERE n_id = ?").get(n_id) || null;
};

// n_ts_ms_end = null means "currently running" (round-trips through NULL)
let f_o_timertrack__create = function (n_o_workspace_n_id, n_o_activity_n_id, n_ts_ms_start) {
  let o_db = f_o_db();
  let n_ms = Date.now();
  let o_res = o_db
    .prepare(
      "INSERT INTO o_timertrack (n_o_workspace_n_id, n_o_activity_n_id, n_ts_ms_start, s_notes, n_ts_ms__created, n_ts_ms__updated) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(n_o_workspace_n_id, n_o_activity_n_id, n_ts_ms_start, "", n_ms, n_ms);
  return f_o_timertrack__by_n_id(Number(o_res.lastInsertRowid));
};

let f_o_timertrack__running = function (n_o_workspace_n_id) {
  let o_db = f_o_db();
  return o_db
    .prepare("SELECT * FROM o_timertrack WHERE n_o_workspace_n_id = ? AND n_ts_ms_end IS NULL")
    .get(n_o_workspace_n_id) || null;
};

// closes the (single) running track in a workspace, if any
let f_stop__running = function (n_o_workspace_n_id, n_ts_ms_end) {
  let o_db = f_o_db();
  let n_ms = Date.now();
  o_db
    .prepare(
      "UPDATE o_timertrack SET n_ts_ms_end = ?, n_ts_ms__updated = ? WHERE n_o_workspace_n_id = ? AND n_ts_ms_end IS NULL",
    )
    .run(n_ts_ms_end, n_ms, n_o_workspace_n_id);
};

let f_o_timertrack__update = function (n_id, n_ts_ms_start, n_ts_ms_end, s_notes) {
  let o_db = f_o_db();
  let n_ms = Date.now();
  o_db
    .prepare(
      "UPDATE o_timertrack SET n_ts_ms_start = ?, n_ts_ms_end = ?, s_notes = ?, n_ts_ms__updated = ? WHERE n_id = ?",
    )
    .run(n_ts_ms_start, n_ts_ms_end, s_notes, n_ms, n_id);
  return f_o_timertrack__by_n_id(n_id);
};

let f_o_timertrack__delete = function (n_id) {
  let o_db = f_o_db();
  o_db.prepare("DELETE FROM o_timertrack WHERE n_id = ?").run(n_id);
};

let f_a_o_timertrack__by_workspace = function (n_o_workspace_n_id) {
  let o_db = f_o_db();
  return o_db
    .prepare("SELECT * FROM o_timertrack WHERE n_o_workspace_n_id = ? ORDER BY n_ts_ms_start DESC")
    .all(n_o_workspace_n_id);
};

export {
  f_o_timertrack__create,
  f_o_timertrack__running,
  f_stop__running,
  f_o_timertrack__update,
  f_o_timertrack__delete,
  f_a_o_timertrack__by_workspace,
  f_o_timertrack__by_n_id,
};
