// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import * as o_path from "node:path";

// end-to-end smoke test: spawns its own server (isolated port + temp database),
// drives the full websocket flow, then tears down. run with: deno task test
let S_PATH__APP = import.meta.dirname; // application/
let N_PORT = 8137;
let S_PATH__TMPDATA = o_path.join(S_PATH__APP, "test_tmp", "smoke");

let f_o_ws__connect = function (s_url) {
  return new Promise(function (f_resolve, f_reject) {
    let o_ws = new WebSocket(s_url);
    o_ws.onopen = function () { f_resolve(o_ws); };
    o_ws.onerror = function (o_err) { f_reject(o_err); };
  });
};

let f_wait__s_type = async function (a_o_msg, s_type, n_ms__timeout) {
  let n_ms__start = Date.now();
  while (Date.now() - n_ms__start < (n_ms__timeout || 2000)) {
    let n_idx = a_o_msg.findIndex((o) => o.s_type == s_type);
    if (n_idx >= 0) return a_o_msg.splice(n_idx, 1)[0];
    await new Promise((f) => setTimeout(f, 20));
  }
  throw new Error(`timeout waiting for ${s_type}`);
};

let f_run__flow = async function (o_ws) {
  let a_o_msg = [];
  o_ws.onmessage = function (o_evt) { a_o_msg.push(JSON.parse(o_evt.data)); };
  let f_send = function (s_type, v_data) { o_ws.send(JSON.stringify({ s_type, v_data, n_ts_ms: Date.now() })); };
  let f_assert = function (b, s) { if (!b) throw new Error("ASSERT FAILED: " + s); };

  await f_wait__s_type(a_o_msg, "workspace.bootstrap");
  f_send("workspace.create", {});
  await f_wait__s_type(a_o_msg, "workspace.created");
  await f_wait__s_type(a_o_msg, "activity.listed");
  await f_wait__s_type(a_o_msg, "timer.current");
  await f_wait__s_type(a_o_msg, "timertrack.listed");

  f_send("activity.create", { s_name: "chess" });
  await f_wait__s_type(a_o_msg, "activity.listed");
  f_send("activity.create", { s_name: "reading" });
  f_assert((await f_wait__s_type(a_o_msg, "activity.listed")).v_data.a_o_activity.length == 2, "two activities created");

  f_send("activity.set_sort", { s_sort: "name" });
  let o_listed = await f_wait__s_type(a_o_msg, "activity.listed");
  f_assert(
    JSON.stringify(o_listed.v_data.a_o_activity.map((o) => o.s_name)) == JSON.stringify(["chess", "reading"]),
    "server-side name sort = [chess, reading]",
  );
  let o_activity__chess = o_listed.v_data.a_o_activity.find((o) => o.s_name == "chess");
  let o_activity__reading = o_listed.v_data.a_o_activity.find((o) => o.s_name == "reading");

  // single-active timer rule
  f_send("timer.start", { n_o_activity_n_id: o_activity__chess.n_id });
  let o_cur = await f_wait__s_type(a_o_msg, "timer.current");
  await f_wait__s_type(a_o_msg, "timertrack.listed");
  f_assert(o_cur.v_data.o_timertrack.n_o_activity_n_id == o_activity__chess.n_id, "chess timer running");

  f_send("timer.start", { n_o_activity_n_id: o_activity__reading.n_id });
  o_cur = await f_wait__s_type(a_o_msg, "timer.current");
  await f_wait__s_type(a_o_msg, "timertrack.listed");
  f_assert(o_cur.v_data.o_timertrack.n_o_activity_n_id == o_activity__reading.n_id, "running track switched to reading");

  f_send("timer.stop", {});
  f_assert((await f_wait__s_type(a_o_msg, "timer.current")).v_data.o_timertrack == null, "no timer running after stop");

  f_send("timertrack.list", {});
  let o_tracks = await f_wait__s_type(a_o_msg, "timertrack.listed");
  let a_o_track = o_tracks.v_data.a_o_timertrack;
  f_assert(a_o_track.length == 2, "two tracks recorded");
  f_assert(!a_o_track.some((o) => o.n_ts_ms_end == null), "no track left running");
  let o_track__chess = a_o_track.find((o) => o.n_o_activity_n_id == o_activity__chess.n_id);
  f_assert(o_track__chess.n_ts_ms_end != null, "chess track auto-closed when reading started");

  // edit a recorded track
  f_send("timertrack.update", {
    n_id: o_track__chess.n_id,
    n_ts_ms_start: o_track__chess.n_ts_ms_start,
    n_ts_ms_end: o_track__chess.n_ts_ms_end,
    s_notes: "edited note",
  });
  await f_wait__s_type(a_o_msg, "timertrack.listed");
  f_send("timertrack.list", {});
  o_tracks = await f_wait__s_type(a_o_msg, "timertrack.listed");
  f_assert(
    o_tracks.v_data.a_o_timertrack.find((o) => o.n_id == o_track__chess.n_id).s_notes == "edited note",
    "track notes updated",
  );

  // delete activity cascades its tracks away
  f_send("activity.delete", { n_id: o_activity__reading.n_id });
  await f_wait__s_type(a_o_msg, "activity.listed");
  await f_wait__s_type(a_o_msg, "timertrack.listed");
  f_send("timertrack.list", {});
  o_tracks = await f_wait__s_type(a_o_msg, "timertrack.listed");
  f_assert(
    !o_tracks.v_data.a_o_timertrack.some((o) => o.n_o_activity_n_id == o_activity__reading.n_id),
    "deleted activity's tracks cascaded away",
  );

  o_ws.close();
};

Deno.test("time tracker end-to-end (ws)", async function () {
  // isolated temp database
  try { Deno.removeSync(S_PATH__TMPDATA, { recursive: true }); } catch (_) {}
  Deno.mkdirSync(S_PATH__TMPDATA, { recursive: true });

  let o_child = new Deno.Command("deno", {
    args: [
      "run",
      "--allow-net",
      `--allow-read=${S_PATH__APP}`,
      `--allow-write=${S_PATH__TMPDATA}`,
      o_path.join(S_PATH__APP, "server", "main.js"),
      String(N_PORT),
      S_PATH__TMPDATA,
    ],
    stdout: "inherit",
    stderr: "inherit",
  }).spawn();

  try {
    // wait for the server to listen
    let b__up = false;
    for (let n_it = 0; n_it < 100; n_it++) {
      try {
        let o_res = await fetch(`http://localhost:${N_PORT}/`);
        o_res.body?.cancel();
        if (o_res.status == 200) { b__up = true; break; }
      } catch (_) {}
      await new Promise((f) => setTimeout(f, 100));
    }
    if (!b__up) { throw new Error("server did not start in time"); }

    let o_ws = await f_o_ws__connect(`ws://localhost:${N_PORT}/ws`);
    await f_run__flow(o_ws);
  } finally {
    try { o_child.kill("SIGTERM"); } catch (_) {}
    try { await o_child.status; } catch (_) {}
    try { Deno.removeSync(S_PATH__TMPDATA, { recursive: true }); } catch (_) {}
  }
});
