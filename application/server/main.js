// Copyright (C) 2026 Jonas Immanuel Frey - Licensed under MIT. See LICENSE file for details
import { f_o_db } from "./db.js";
import { f_handle__ws_upgrade } from "./ws_server.js";
import * as o_path from "node:path";

let N_PORT = Number(Deno.args[0]) || 8000;
// resolved from this module's location so the server runs regardless of cwd;
// optional data-dir override (args[1]) lets tests use an isolated database.
let S_PATH__CLIENT__ABS = o_path.resolve(import.meta.dirname, "..", "client");
let S_PATH__DATA__DIR = Deno.args[1] || null;

let o_map__content_type = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

let f_s_content_type__from_path = function (s_path) {
  let n_idx__dot = s_path.lastIndexOf(".");
  let s_ext = n_idx__dot >= 0 ? s_path.slice(n_idx__dot).toLowerCase() : "";
  return o_map__content_type[s_ext] || "application/octet-stream";
};

// resolve a client-relative path and confirm it stays inside the client root.
// (defense in depth: the URL parser already normalizes "..", but we verify explicitly)
let f_b__path__within_client = function (s_path__file) {
  return s_path__file == S_PATH__CLIENT__ABS ||
    s_path__file.startsWith(S_PATH__CLIENT__ABS + o_path.sep);
};

let f_o_res__from_client = async function (s_path__relative) {
  let s_path__file = o_path.resolve(S_PATH__CLIENT__ABS, s_path__relative);
  if (!f_b__path__within_client(s_path__file)) {
    return new Response("forbidden", { status: 403 });
  }
  try {
    let a_o_b = await Deno.readFile(s_path__file);
    return new Response(a_o_b, { headers: { "content-type": f_s_content_type__from_path(s_path__file) } });
  } catch (_) {
    return new Response("not found", { status: 404 });
  }
};

let f_b__path__is_spa = function (s_pathname) {
  if (s_pathname == "/") { return true; }
  // single-segment path (the workspace uuid) -> serve the SPA shell
  return s_pathname.split("/").filter(function (s) { return s.length > 0; }).length == 1;
};

let f_handle__http = function (o_req) {
  let o_url = new URL(o_req.url);

  if (o_req.headers.get("upgrade")?.toLowerCase() == "websocket" && o_url.pathname == "/ws") {
    return f_handle__ws_upgrade(o_req);
  }

  if (o_url.pathname.startsWith("/client/")) {
    let s_path__relative = o_url.pathname.slice("/client/".length);
    return f_o_res__from_client(s_path__relative);
  }

  if (f_b__path__is_spa(o_url.pathname)) {
    return f_o_res__from_client("index.html");
  }

  return new Response("not found", { status: 404 });
};

let f_main = function () {
  f_o_db(S_PATH__DATA__DIR ? o_path.resolve(S_PATH__DATA__DIR, "app.db") : null); // ensure data dir + schema
  Deno.serve({ port: N_PORT }, f_handle__http);
  console.log(`time tracker listening on http://localhost:${N_PORT}`);
};

f_main();
