// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import * as o_path from "node:path";

// end-to-end smoke test: spawns its own server (isolated port + temp database),
// drives the websocket flow, then tears down. run with: deno task test
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

let f_run__flow = async function (o_ws) {
  let a_o_msg = [];
  o_ws.onmessage = function (o_evt) { a_o_msg.push(JSON.parse(o_evt.data)); };
  let f_send = function (s_type, v_data) { o_ws.send(JSON.stringify({ s_type, v_data, n_ts_ms: Date.now() })); };
  let f_sleep = function (n_ms) { return new Promise(function (f) { setTimeout(f, n_ms); }); };
  let f_assert = function (b, s) { if (!b) throw new Error("ASSERT FAILED: " + s); };

  // wait for the first message of s_type, then quiet-drain further ones; return the latest.
  // (a mutation broadcasts several snapshots — we always want the most recent.)
  let f_o__latest = async function (s_type, n_ms__timeout) {
    let n_ms__deadline = Date.now() + (n_ms__timeout || 2000);
    while (Date.now() < n_ms__deadline) {
      if (a_o_msg.some((o) => o.s_type == s_type)) break;
      await f_sleep(15);
    }
    for (;;) {
      let n_cnt = a_o_msg.filter((o) => o.s_type == s_type).length;
      await f_sleep(60);
      if (Date.now() >= n_ms__deadline) break;
      if (a_o_msg.filter((o) => o.s_type == s_type).length == n_cnt) break;
    }
    let a = a_o_msg.filter((o) => o.s_type == s_type);
    if (!a.length) throw new Error(`timeout waiting for ${s_type}`);
    return a[a.length - 1];
  };
  let f_o_activity__by_name = function (s_name) {
    let a = a_o_msg.filter((o) => o.s_type == "activity.listed");
    if (!a.length) return null;
    return a[a.length - 1].v_data.a_o_activity.find((o) => o.s_name == s_name) || null;
  };

  await f_o__latest("workspace.bootstrap");
  f_send("workspace.create", {});
  await f_o__latest("workspace.created");
  await f_o__latest("activity.listed");

  f_send("activity.create", { s_name: "chess" });
  await f_o__latest("activity.listed");
  f_send("activity.create", { s_name: "reading" });
  await f_o__latest("activity.listed");
  f_assert(f_o_activity__by_name("chess") && f_o_activity__by_name("reading"), "two activities exist");
  f_assert(f_o_activity__by_name("chess").n_ms__sum == 0, "sum starts at 0");

  // play chess -> running; sum must stay 0 while running
  f_send("timer.start", { n_o_activity_n_id: f_o_activity__by_name("chess").n_id });
  let o_cur = await f_o__latest("timer.current");
  await f_o__latest("activity.listed");
  f_assert(o_cur.v_data.o_timertrack.n_o_activity_n_id == f_o_activity__by_name("chess").n_id, "chess is running");
  f_assert(f_o_activity__by_name("chess").n_ms__sum == 0, "sum stays 0 while running");
  await f_sleep(50); // ensure a measurable duration

  // play reading -> auto-pauses chess; chess sum must now be > 0
  f_send("timer.start", { n_o_activity_n_id: f_o_activity__by_name("reading").n_id });
  o_cur = await f_o__latest("timer.current");
  await f_o__latest("activity.listed");
  f_assert(o_cur.v_data.o_timertrack.n_o_activity_n_id == f_o_activity__by_name("reading").n_id, "running switched to reading");
  f_assert(f_o_activity__by_name("chess").n_ms__sum > 0, "chess sum updated on auto-pause");
  f_assert(f_o_activity__by_name("reading").n_ms__sum == 0, "reading sum still 0 while running");
  await f_sleep(50);

  // pause reading -> reading sum must now be > 0
  f_send("timer.stop", {});
  o_cur = await f_o__latest("timer.current");
  await f_o__latest("activity.listed");
  f_assert(o_cur.v_data.o_timertrack == null, "no timer running after pause");
  f_assert(f_o_activity__by_name("reading").n_ms__sum > 0, "reading sum updated on pause");

  // delete reading -> gone; chess sum unchanged
  f_send("activity.delete", { n_id: f_o_activity__by_name("reading").n_id });
  await f_o__latest("activity.listed");
  f_assert(!f_o_activity__by_name("reading"), "deleted activity is gone");
  f_assert(f_o_activity__by_name("chess").n_ms__sum > 0, "chess sum unchanged after deleting another activity");

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
