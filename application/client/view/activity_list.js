// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
let { ref } = Vue;

let f_o_component__activity_list = function (o_store, o_ws) {
  return {
    template: `
      <div>
        <div class="row">
          <select v-model="s_sort" @change="f_set_sort">
            <option value="last_tracked">sort: last tracked</option>
            <option value="name">sort: name</option>
          </select>
        </div>
        <div class="row">
          <input type="text" v-model="s_name__new" @keyup.enter="f_create" placeholder="new activity name" />
          <button @click="f_create">Add</button>
        </div>
        <ul>
          <li v-for="o_activity in o_store.a_o_activity" :key="o_activity.n_id">
            <span v-if="n_id__editing != o_activity.n_id">{{ o_activity.s_name }}</span>
            <input v-else type="text" v-model="s_name__edit" @keyup.enter="f_save(o_activity)" />
            <button v-if="n_id__editing != o_activity.n_id" @click="f_start_edit(o_activity)">edit</button>
            <button v-if="n_id__editing == o_activity.n_id" @click="f_save(o_activity)">save</button>
            <button @click="f_track(o_activity)">track</button>
            <button class="btn--danger" @click="f_delete(o_activity)">delete</button>
          </li>
        </ul>
        <div class="muted" v-if="o_store.a_o_activity.length == 0">no activities yet</div>
      </div>
    `,
    setup() {
      let s_sort = ref("last_tracked");
      let s_name__new = ref("");
      let n_id__editing = ref(null);
      let s_name__edit = ref("");

      let f_set_sort = function () {
        o_ws.f_send("activity.set_sort", { s_sort: s_sort.value });
      };
      let f_create = function () {
        let s_name = s_name__new.value.trim();
        if (!s_name) { return; }
        o_ws.f_send("activity.create", { s_name });
        s_name__new.value = "";
      };
      let f_start_edit = function (o_activity) {
        n_id__editing.value = o_activity.n_id;
        s_name__edit.value = o_activity.s_name;
      };
      let f_save = function (o_activity) {
        let s_name = s_name__edit.value.trim();
        if (!s_name) { return; }
        o_ws.f_send("activity.update", { n_id: o_activity.n_id, s_name });
        n_id__editing.value = null;
      };
      let f_delete = function (o_activity) {
        o_ws.f_send("activity.delete", { n_id: o_activity.n_id });
      };
      let f_track = function (o_activity) {
        o_ws.f_send("timer.start", { n_o_activity_n_id: o_activity.n_id });
      };

      return { o_store, s_sort, s_name__new, n_id__editing, s_name__edit, f_set_sort, f_create, f_start_edit, f_save, f_delete, f_track };
    },
  };
};

export { f_o_component__activity_list };
