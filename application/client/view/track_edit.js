// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_s_datetime_local__from_ms, f_n_ms__from_s_datetime_local, f_s__from_n_ms__duration } from "../util.js";

let { ref, watch } = Vue;

// editable mirror of the server-provided tracks; string fields feed datetime-local inputs.
// the server stays authoritative — saving sends timertrack.update and the broadcast re-syncs.
let f_o_component__track_edit = function (o_store, o_ws) {
  return {
    template: `
      <div>
        <table>
          <thead>
            <tr><th>Activity</th><th>Start</th><th>End</th><th>Duration</th><th>Notes</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="o_track in a_o_track__editable" :key="o_track.n_id">
              <td>{{ f_s_name__activity(o_track.n_o_activity_n_id) }}</td>
              <td><input type="datetime-local" v-model="o_track.s_start" /></td>
              <td><input type="datetime-local" v-model="o_track.s_end" /></td>
              <td class="muted">{{ f_s_duration(o_track) }}</td>
              <td><input type="text" v-model="o_track.s_notes" @keyup.enter="f_save(o_track)" /></td>
              <td>
                <button @click="f_save(o_track)">save</button>
                <button class="btn--danger" @click="f_delete(o_track)">delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="muted" v-if="a_o_track__editable.length == 0">no recorded time yet</div>
      </div>
    `,
    setup() {
      let a_o_track__editable = ref([]);

      let f_sync = function () {
        a_o_track__editable.value = o_store.a_o_timertrack.map(function (o_t) {
          return {
            n_id: o_t.n_id,
            n_o_activity_n_id: o_t.n_o_activity_n_id,
            n_ts_ms_start: o_t.n_ts_ms_start,
            n_ts_ms_end: o_t.n_ts_ms_end,
            s_start: f_s_datetime_local__from_ms(o_t.n_ts_ms_start),
            s_end: f_s_datetime_local__from_ms(o_t.n_ts_ms_end),
            s_notes: o_t.s_notes || "",
          };
        });
      };
      // server replaces the whole array on each broadcast -> reference change re-syncs
      watch(function () { return o_store.a_o_timertrack; }, f_sync);
      f_sync();

      let f_s_name__activity = function (n_id) {
        let o_activity = o_store.a_o_activity.find(function (o) { return o.n_id == n_id; });
        return o_activity ? o_activity.s_name : "(removed)";
      };
      let f_s_duration = function (o_track) {
        let n_end = o_track.n_ts_ms_end != null ? o_track.n_ts_ms_end : Date.now();
        return f_s__from_n_ms__duration(n_end - o_track.n_ts_ms_start);
      };
      let f_save = function (o_track) {
        let n_ts_ms_start = f_n_ms__from_s_datetime_local(o_track.s_start);
        let n_ts_ms_end = f_n_ms__from_s_datetime_local(o_track.s_end); // empty -> null (running)
        if (n_ts_ms_start == null) { return; }
        o_ws.f_send("timertrack.update", {
          n_id: o_track.n_id,
          n_ts_ms_start,
          n_ts_ms_end,
          s_notes: o_track.s_notes,
        });
      };
      let f_delete = function (o_track) {
        o_ws.f_send("timertrack.delete", { n_id: o_track.n_id });
      };

      return { a_o_track__editable, f_s_name__activity, f_s_duration, f_save, f_delete };
    },
  };
};

export { f_o_component__track_edit };
