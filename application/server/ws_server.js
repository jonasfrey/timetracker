// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_o_msg, f_o_msg__parse } from "./msg.js";
import { f_register, f_unregister, f_broadcast__workspace } from "./conn_registry.js";
import * as o_repo__workspace from "./repo/o_workspace.js";
import * as o_repo__activity from "./repo/o_activity.js";
import * as o_repo__timertrack from "./repo/o_timertrack.js";
import * as o_repo__key_val from "./repo/o_key_val.js";

let S_KEY__SORT = "activity.sort";
let S_SORT__DEFAULT = "last_tracked";

// ---- snapshot builders: the server is the single source of truth -------------
let f_o_msg__activity_listed = function (n_id__workspace) {
  let s_sort = o_repo__key_val.f_o_key_val__get(n_id__workspace, S_KEY__SORT) || S_SORT__DEFAULT;
  let a_o_activity = o_repo__activity.f_a_o_activity__by_workspace(n_id__workspace, s_sort);
  return f_o_msg("activity.listed", { a_o_activity });
};

let f_o_msg__timertrack_listed = function (n_id__workspace) {
  let a_o_timertrack = o_repo__timertrack.f_a_o_timertrack__by_workspace(n_id__workspace);
  return f_o_msg("timertrack.listed", { a_o_timertrack });
};

let f_o_msg__timer_current = function (n_id__workspace) {
  let o_timertrack = o_repo__timertrack.f_o_timertrack__running(n_id__workspace);
  return f_o_msg("timer.current", { o_timertrack });
};

let f_push__initial = function (o_ws, n_id__workspace) {
  o_ws.send(JSON.stringify(f_o_msg__activity_listed(n_id__workspace)));
  o_ws.send(JSON.stringify(f_o_msg__timer_current(n_id__workspace)));
  o_ws.send(JSON.stringify(f_o_msg__timertrack_listed(n_id__workspace)));
};

// ---- message router ----------------------------------------------------------
// reads the live binding o_ws.n_id__workspace (null in bootstrap mode)
let f_route__msg = function (o_ws, o_msg) {
  let n_id__workspace = o_ws.n_id__workspace;
  let s_type = o_msg.s_type;
  let v_data = o_msg.v_data || {};

  if (n_id__workspace == null) {
    // unscoped (bootstrap): only workspace.create is allowed
    if (s_type == "workspace.create") {
      let o_workspace = o_repo__workspace.f_o_workspace__create();
      o_ws.n_id__workspace = o_workspace.n_id;
      f_register(o_workspace.n_id, o_ws);
      o_ws.send(JSON.stringify(f_o_msg("workspace.created", { o_workspace })));
      f_push__initial(o_ws, o_workspace.n_id);
    }
    return;
  }

  switch (s_type) {
    case "activity.list":
      o_ws.send(JSON.stringify(f_o_msg__activity_listed(n_id__workspace)));
      break;
    case "activity.create":
      o_repo__activity.f_o_activity__create(n_id__workspace, v_data.s_name);
      f_broadcast__workspace(n_id__workspace, f_o_msg__activity_listed(n_id__workspace));
      break;
    case "activity.update":
      o_repo__activity.f_o_activity__update(v_data.n_id, v_data.s_name);
      f_broadcast__workspace(n_id__workspace, f_o_msg__activity_listed(n_id__workspace));
      break;
    case "activity.delete":
      o_repo__activity.f_o_activity__delete(v_data.n_id);
      f_broadcast__workspace(n_id__workspace, f_o_msg__activity_listed(n_id__workspace));
      f_broadcast__workspace(n_id__workspace, f_o_msg__timertrack_listed(n_id__workspace));
      break;
    case "activity.set_sort":
      o_repo__key_val.f_o_key_val__set(n_id__workspace, S_KEY__SORT, v_data.s_sort);
      f_broadcast__workspace(n_id__workspace, f_o_msg__activity_listed(n_id__workspace));
      break;

    case "timer.start": {
      // single active timer per workspace: close any running track, then open a new one
      let n_ms__now = Date.now();
      o_repo__timertrack.f_stop__running(n_id__workspace, n_ms__now);
      o_repo__timertrack.f_o_timertrack__create(n_id__workspace, v_data.n_o_activity_n_id, n_ms__now);
      f_broadcast__workspace(n_id__workspace, f_o_msg__timer_current(n_id__workspace));
      f_broadcast__workspace(n_id__workspace, f_o_msg__timertrack_listed(n_id__workspace));
      break;
    }
    case "timer.stop": {
      let n_ms__now = Date.now();
      o_repo__timertrack.f_stop__running(n_id__workspace, n_ms__now);
      f_broadcast__workspace(n_id__workspace, f_o_msg__timer_current(n_id__workspace));
      f_broadcast__workspace(n_id__workspace, f_o_msg__timertrack_listed(n_id__workspace));
      break;
    }
    case "timer.current":
      o_ws.send(JSON.stringify(f_o_msg__timer_current(n_id__workspace)));
      break;

    case "timertrack.list":
      o_ws.send(JSON.stringify(f_o_msg__timertrack_listed(n_id__workspace)));
      break;
    case "timertrack.update":
      o_repo__timertrack.f_o_timertrack__update(
        v_data.n_id,
        v_data.n_ts_ms_start,
        v_data.n_ts_ms_end,
        v_data.s_notes,
      );
      f_broadcast__workspace(n_id__workspace, f_o_msg__timertrack_listed(n_id__workspace));
      break;
    case "timertrack.delete":
      o_repo__timertrack.f_o_timertrack__delete(v_data.n_id);
      f_broadcast__workspace(n_id__workspace, f_o_msg__timertrack_listed(n_id__workspace));
      break;

    default:
      break;
  }
};

let f_bind__socket = function (o_req, n_id__workspace) {
  let { socket: o_ws, response: o_res } = Deno.upgradeWebSocket(o_req);
  o_ws.n_id__workspace = n_id__workspace; // null => bootstrap connection
  if (n_id__workspace != null) {
    f_register(n_id__workspace, o_ws);
  }
  o_ws.onopen = function () {
    if (n_id__workspace != null) {
      f_push__initial(o_ws, n_id__workspace);
    } else {
      // no known workspace: tell the client to create one
      o_ws.send(JSON.stringify(f_o_msg("workspace.bootstrap", {})));
    }
  };
  o_ws.onmessage = function (o_evt) {
    let o_msg = f_o_msg__parse(o_evt.data);
    if (!o_msg || typeof o_msg.s_type != "string") { return; }
    try {
      f_route__msg(o_ws, o_msg);
    } catch (o_err) {
      console.error("route error:", o_err);
    }
  };
  o_ws.onclose = function () {
    if (o_ws.n_id__workspace != null) {
      f_unregister(o_ws.n_id__workspace, o_ws);
    }
  };
  o_ws.onerror = function (o_err) {
    console.error("ws error:", o_err);
  };
  return o_res;
};

// called from main.js for any /ws request with an upgrade header
let f_handle__ws_upgrade = function (o_req) {
  let o_url = new URL(o_req.url);
  let s_uuid = o_url.searchParams.get("s_uuid");
  if (s_uuid) {
    let o_workspace = o_repo__workspace.f_o_workspace__by_uuid(s_uuid);
    if (!o_workspace) {
      // unknown uuid: treat as bootstrap (client will create a fresh workspace)
      return f_bind__socket(o_req, null);
    }
    return f_bind__socket(o_req, o_workspace.n_id);
  }
  return f_bind__socket(o_req, null);
};

export { f_handle__ws_upgrade };
