// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_s__from_n_ms__duration } from "../util.js";

let { ref, computed, onUnmounted } = Vue;

// the live elapsed display is rendering only: the server is the source of truth
// for the running track's start; the client just ticks Date.now() to format it.
let f_o_component__timer = function (o_store, o_ws) {
  return {
    template: `
      <div>
        <div class="row">
          <select v-model="n_o_activity_n_id__selected">
            <option :value="null" disabled>pick an activity…</option>
            <option v-for="o_activity in o_store.a_o_activity" :key="o_activity.n_id" :value="o_activity.n_id">
              {{ o_activity.s_name }}
            </option>
          </select>
          <button @click="f_start" :disabled="o_store.o_timertrack__current != null || n_o_activity_n_id__selected == null">Start</button>
        </div>
        <div v-if="o_store.o_timertrack__current">
          <div class="elapsed">{{ s_elapsed }}</div>
          <div class="nowtracking">tracking: {{ s_name__current }}</div>
          <button @click="f_stop">Stop</button>
        </div>
        <div v-else class="idle">no active timer</div>
      </div>
    `,
    setup() {
      let n_o_activity_n_id__selected = ref(null);
      let n_ms__now = ref(Date.now());
      let n_id__interval = setInterval(function () { n_ms__now.value = Date.now(); }, 1000);
      onUnmounted(function () { clearInterval(n_id__interval); });

      let s_name__current = computed(function () {
        let o_timertrack = o_store.o_timertrack__current;
        if (!o_timertrack) { return ""; }
        let o_activity = o_store.a_o_activity.find(function (o) { return o.n_id == o_timertrack.n_o_activity_n_id; });
        return o_activity ? o_activity.s_name : "(removed activity)";
      });

      let s_elapsed = computed(function () {
        let o_timertrack = o_store.o_timertrack__current;
        if (!o_timertrack) { return ""; }
        return f_s__from_n_ms__duration(n_ms__now.value - o_timertrack.n_ts_ms_start);
      });

      let f_start = function () {
        if (n_o_activity_n_id__selected.value == null) { return; }
        o_ws.f_send("timer.start", { n_o_activity_n_id: n_o_activity_n_id__selected.value });
      };
      let f_stop = function () { o_ws.f_send("timer.stop", {}); };

      return { o_store, n_o_activity_n_id__selected, s_name__current, s_elapsed, f_start, f_stop };
    },
  };
};

export { f_o_component__timer };
