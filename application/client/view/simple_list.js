// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_s__from_n_ms__duration } from "../util.js";

let { ref, computed, onUnmounted } = Vue;

// the default view: a simple todo-like list. each row shows the activity name, the
// sum of completed tracked time, a play/pause button, and a delete button. while an
// activity is running its live elapsed shows; the sum only updates on pause (server side).
let f_o_component__simple_list = function (o_store, o_ws) {
  return {
    template: `
      <div class="simple">
        <div class="row-add">
          <input type="text" v-model="s_name__new" @keyup.enter="f_create" placeholder="add an activity…" />
          <button @click="f_create">Add</button>
        </div>
        <ul>
          <li
            v-for="o_activity in o_store.a_o_activity"
            :key="o_activity.n_id"
            class="row"
            :class="{ 'row--running': f_b__running(o_activity) }"
          >
            <button class="btn-play" @click="f_toggle(o_activity)">
              {{ f_b__running(o_activity) ? "⏸" : "▶" }}
            </button>
            <div class="info">
              <div class="name">{{ o_activity.s_name }}</div>
              <div class="current" v-if="f_b__running(o_activity)">+ {{ s_elapsed }}</div>
            </div>
            <div class="sum">{{ f_s_sum(o_activity) }}</div>
            <button class="btn-del" @click="f_delete(o_activity)" title="delete">✕</button>
          </li>
        </ul>
        <div class="empty" v-if="o_store.a_o_activity.length == 0">no activities yet — add one above</div>
      </div>
    `,
    setup() {
      let s_name__new = ref("");
      let n_ms__now = ref(Date.now());
      // live elapsed is display only: the server is the source of truth for the start ts
      let n_id__interval = setInterval(function () { n_ms__now.value = Date.now(); }, 1000);
      onUnmounted(function () { clearInterval(n_id__interval); });

      let f_b__running = function (o_activity) {
        let o_timertrack = o_store.o_timertrack__current;
        return !!o_timertrack && o_timertrack.n_o_activity_n_id == o_activity.n_id;
      };

      let s_elapsed = computed(function () {
        let o_timertrack = o_store.o_timertrack__current;
        if (!o_timertrack) { return ""; }
        return f_s__from_n_ms__duration(n_ms__now.value - o_timertrack.n_ts_ms_start);
      });

      let f_s_sum = function (o_activity) {
        return f_s__from_n_ms__duration(o_activity.n_ms__sum || 0);
      };

      let f_create = function () {
        let s_name = s_name__new.value.trim();
        if (!s_name) { return; }
        o_ws.f_send("activity.create", { s_name });
        s_name__new.value = "";
      };

      let f_delete = function (o_activity) {
        o_ws.f_send("activity.delete", { n_id: o_activity.n_id });
      };

      // play starts tracking (server auto-pauses anything else running); pause stops it
      let f_toggle = function (o_activity) {
        if (f_b__running(o_activity)) {
          o_ws.f_send("timer.stop", {});
        } else {
          o_ws.f_send("timer.start", { n_o_activity_n_id: o_activity.n_id });
        }
      };

      return { o_store, s_name__new, s_elapsed, f_b__running, f_s_sum, f_create, f_delete, f_toggle };
    },
  };
};

export { f_o_component__simple_list };
