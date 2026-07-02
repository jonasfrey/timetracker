// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// workspace_n_id -> Set of live websockets for that workspace.
// lets us broadcast authoritative snapshots so every tab stays in sync.
let o_map__set_ws__by_n_id__workspace = new Map();

let f_set_ws__ensure = function (n_id__workspace) {
  if (!o_map__set_ws__by_n_id__workspace.has(n_id__workspace)) {
    o_map__set_ws__by_n_id__workspace.set(n_id__workspace, new Set());
  }
  return o_map__set_ws__by_n_id__workspace.get(n_id__workspace);
};

let f_register = function (n_id__workspace, o_ws) {
  f_set_ws__ensure(n_id__workspace).add(o_ws);
};

let f_unregister = function (n_id__workspace, o_ws) {
  let set_ws = o_map__set_ws__by_n_id__workspace.get(n_id__workspace);
  if (set_ws) { set_ws.delete(o_ws); }
};

// send o_msg to every open socket in the workspace (broadcast includes originator:
// the client is a pure renderer and just replaces its store with the snapshot)
let f_broadcast__workspace = function (n_id__workspace, o_msg) {
  let set_ws = o_map__set_ws__by_n_id__workspace.get(n_id__workspace);
  if (!set_ws) { return; }
  let s_msg = JSON.stringify(o_msg);
  for (let o_ws of set_ws) {
    if (o_ws.readyState == 1) { // OPEN
      try { o_ws.send(s_msg); } catch (_) {}
    }
  }
};

export { f_register, f_unregister, f_broadcast__workspace };
