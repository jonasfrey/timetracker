// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// standardized websocket envelope: { s_type, v_data, n_ts_ms }
let f_o_msg = function (s_type, v_data) {
  return { s_type, v_data, n_ts_ms: Date.now() };
};

let f_o_msg__parse = function (s_raw) {
  try { return JSON.parse(s_raw); } catch (_) { return null; }
};

export { f_o_msg, f_o_msg__parse };
