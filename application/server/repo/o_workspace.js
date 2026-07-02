// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_o_db } from "../db.js";

let f_o_workspace__by_n_id = function (n_id) {
  let o_db = f_o_db();
  return o_db.prepare("SELECT * FROM o_workspace WHERE n_id = ?").get(n_id) || null;
};

let f_o_workspace__by_uuid = function (s_uuid) {
  let o_db = f_o_db();
  return o_db.prepare("SELECT * FROM o_workspace WHERE s_uuid = ?").get(s_uuid) || null;
};

let f_o_workspace__create = function () {
  let o_db = f_o_db();
  let n_ms = Date.now();
  let s_uuid = crypto.randomUUID();
  o_db
    .prepare("INSERT INTO o_workspace (s_uuid, n_ts_ms__created, n_ts_ms__updated) VALUES (?, ?, ?)")
    .run(s_uuid, n_ms, n_ms);
  return f_o_workspace__by_n_id(Number(o_db.prepare("SELECT last_insert_rowid() AS n_id").get().n_id));
};

export { f_o_workspace__create, f_o_workspace__by_uuid, f_o_workspace__by_n_id };
