// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
let { createApp, reactive, ref } = Vue;

import { f_o_ws_client } from "./ws_client.js";
import { f_o_component__timer } from "./view/timer.js";
import { f_o_component__activity_list } from "./view/activity_list.js";
import { f_o_component__track_edit } from "./view/track_edit.js";

let f_s_uuid__from_path = function () {
  let s = location.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  let b__uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  return b__uuid ? s : null;
};

let o_store = reactive({
  s_uuid: null,
  a_o_activity: [],
  o_timertrack__current: null,
  a_o_timertrack: [],
});

let b_connected = ref(false);
let o_ws = f_o_ws_client();

o_ws.f_on("__open", function () { b_connected.value = true; });
o_ws.f_on("__close", function () { b_connected.value = false; });

o_ws.f_on("workspace.bootstrap", function () {
  // server does not know a workspace for this connection -> create one
  o_ws.f_send("workspace.create", {});
});

o_ws.f_on("workspace.created", function (v_data) {
  o_store.s_uuid = v_data.o_workspace.s_uuid;
  o_ws.f_set__s_uuid(o_store.s_uuid);
  history.replaceState(null, "", `/${o_store.s_uuid}`);
});

o_ws.f_on("activity.listed", function (v_data) { o_store.a_o_activity = v_data.a_o_activity; });
o_ws.f_on("timer.current", function (v_data) { o_store.o_timertrack__current = v_data.o_timertrack; });
o_ws.f_on("timertrack.listed", function (v_data) { o_store.a_o_timertrack = v_data.a_o_timertrack; });

let f_o_component__root = function () {
  return {
    template: `
      <div>
        <header class="topbar">
          <h1>Time Tracker</h1>
          <span class="s_uuid" v-if="o_store.s_uuid">{{ o_store.s_uuid }}</span>
          <span class="s_status">{{ b_connected ? "connected" : "reconnecting…" }}</span>
        </header>
        <main class="content">
          <section class="panel">
            <h2>Timer</h2>
            <view-timer />
          </section>
          <section class="panel">
            <h2>Activities</h2>
            <view-activity-list />
          </section>
          <section class="panel panel--wide">
            <h2>Recorded time</h2>
            <view-track-edit />
          </section>
        </main>
      </div>
    `,
    components: {
      "view-timer": f_o_component__timer(o_store, o_ws),
      "view-activity-list": f_o_component__activity_list(o_store, o_ws),
      "view-track-edit": f_o_component__track_edit(o_store, o_ws),
    },
    setup() {
      return { o_store, b_connected };
    },
  };
};

// a uuid in the path scopes the ws connection; no uuid -> bootstrap creates one
let s_uuid__initial = f_s_uuid__from_path();
if (s_uuid__initial) {
  o_store.s_uuid = s_uuid__initial;
  o_ws.f_set__s_uuid(s_uuid__initial);
}
o_ws.f_connect();

createApp(f_o_component__root()).mount("#app");
