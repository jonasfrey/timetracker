// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

let f_s__pad2 = function (n) { return String(n).padStart(2, "0"); };

// epoch ms -> value for <input type="datetime-local"> (local time, "YYYY-MM-DDTHH:mm")
let f_s_datetime_local__from_ms = function (n_ms) {
  if (n_ms == null) { return ""; }
  let o_d = new Date(n_ms);
  return `${o_d.getFullYear()}-${f_s__pad2(o_d.getMonth() + 1)}-${f_s__pad2(o_d.getDate())}T${f_s__pad2(o_d.getHours())}:${f_s__pad2(o_d.getMinutes())}`;
};

// "YYYY-MM-DDTHH:mm" (local) -> epoch ms ; empty string -> null (running)
let f_n_ms__from_s_datetime_local = function (s) {
  if (!s) { return null; }
  let n_ms = new Date(s).getTime();
  return Number.isNaN(n_ms) ? null : n_ms;
};

// n_ms duration -> "HH:MM:SS"
let f_s__from_n_ms__duration = function (n_ms) {
  if (n_ms == null) { return ""; }
  let n_sec__total = Math.max(0, Math.floor(n_ms / 1000));
  let n_h = Math.floor(n_sec__total / 3600);
  let n_min = Math.floor((n_sec__total % 3600) / 60);
  let n_sec = n_sec__total % 60;
  return `${f_s__pad2(n_h)}:${f_s__pad2(n_min)}:${f_s__pad2(n_sec)}`;
};

export { f_s_datetime_local__from_ms, f_n_ms__from_s_datetime_local, f_s__from_n_ms__duration };
