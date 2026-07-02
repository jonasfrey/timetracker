// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details

// thin websocket wrapper: connect (with reconnect), on(s_type, f_cb), send(s_type, v_data)
let f_o_ws_client = function () {
  let s_uuid = null;
  let o_ws = null;
  let n_id__timer__reconnect = null;
  let n_ms__reconnect = 500;
  let o_map__a_f_cb__by_s_type = new Map();

  let f_a_f_cb__ensure = function (s_type) {
    if (!o_map__a_f_cb__by_s_type.has(s_type)) {
      o_map__a_f_cb__by_s_type.set(s_type, []);
    }
    return o_map__a_f_cb__by_s_type.get(s_type);
  };

  let f_on = function (s_type, f_cb) {
    f_a_f_cb__ensure(s_type).push(f_cb);
  };

  let f_dispatch = function (o_msg) {
    let a_f_cb = o_map__a_f_cb__by_s_type.get(o_msg.s_type);
    if (!a_f_cb) { return; }
    for (let f_cb of a_f_cb) {
      try { f_cb(o_msg.v_data, o_msg); } catch (o_err) { console.error(o_err); }
    }
  };

  let f_set__s_uuid = function (s_uuid__next) {
    s_uuid = s_uuid__next;
  };

  let f_s_url = function () {
    let s_proto = location.protocol == "https:" ? "wss:" : "ws:";
    let s_query = s_uuid ? `?s_uuid=${encodeURIComponent(s_uuid)}` : "";
    return `${s_proto}//${location.host}/ws${s_query}`;
  };

  let f_schedule__reconnect = function () {
    if (n_id__timer__reconnect) { return; }
    n_id__timer__reconnect = setTimeout(function () {
      n_id__timer__reconnect = null;
      n_ms__reconnect = Math.min(n_ms__reconnect * 2, 10000);
      f_connect();
    }, n_ms__reconnect);
  };

  let f_connect = function () {
    o_ws = new WebSocket(f_s_url());
    o_ws.onopen = function () {
      n_ms__reconnect = 500;
      f_dispatch({ s_type: "__open", v_data: {} });
    };
    o_ws.onmessage = function (o_evt) {
      try { f_dispatch(JSON.parse(o_evt.data)); } catch (_) {}
    };
    o_ws.onclose = function () {
      f_dispatch({ s_type: "__close", v_data: {} });
      f_schedule__reconnect();
    };
    o_ws.onerror = function () { /* onclose will follow */ };
  };

  let f_send = function (s_type, v_data) {
    if (o_ws && o_ws.readyState == 1) { // OPEN
      o_ws.send(JSON.stringify({ s_type, v_data, n_ts_ms: Date.now() }));
    }
  };

  let f_b__connected = function () {
    return !!o_ws && o_ws.readyState == 1;
  };

  return { f_on, f_send, f_connect, f_set__s_uuid, f_b__connected };
};

export { f_o_ws_client };
