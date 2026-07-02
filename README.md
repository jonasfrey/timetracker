# Time Tracker

Track time spent on activities. Each **workspace** is identified by a secret UUID in
the URL and holds many **activities**; you record time against an activity with a
start/stop timer that writes **timertrack** entries (start / end / notes).

> The high-level requirements and design live in [`source_of_truth/`](./source_of_truth).
> The application source code lives in [`application/`](./application).

## Requirements

- [Deno](https://deno.com) 2.x (all dependencies are built in — no install step).
- A modern browser.

## Run

```bash
cd application
deno task start      # serves on http://localhost:8000 (auto-reloads on file change)
```

Open <http://localhost:8000/>. With no UUID in the URL a fresh workspace is created
and the URL becomes `/<uuid>` — bookmark/share that link to reopen the same workspace
(another tab with the same link stays in sync in real time).

Other tasks:

```bash
deno task rmdb       # delete the sqlite database (start fresh)
deno task test       # end-to-end smoke test (spawns its own isolated server)
```

## Architecture (MVP)

- **Server** (`application/server/`, Deno, pure JS): `Deno.serve` serves the static
  client over HTTP **and** WebSocket upgrades on one port. All business logic lives
  here — sorting, the single-active-timer rule, cascades. State persists in **SQLite**
  via the built-in `node:sqlite`.
- **Client** (`application/client/`, Vue 3 Composition API, no build step): a pure
  renderer. It sends WebSocket requests and renders the server's snapshot replies; it
  does no filtering, sorting, or business logic (the live elapsed-time tick is display only).
- **Protocol**: every message is `{ "s_type", "v_data", "n_ts_ms" }`. Mutations are
  answered by broadcasting an authoritative snapshot to every connection of the workspace.

```
application/
  deno.json            tasks (start / rmdb / test)
  server/
    main.js            HTTP + WS server, static assets, path containment
    ws_server.js       WS upgrade, message router, snapshot broadcasts
    conn_registry.js   workspace -> sockets, broadcast helper
    db.js              singleton SQLite handle + schema
    msg.js             message envelope helpers
    rmdb.js            `deno task rmdb`
    repo/              o_workspace / o_activity / o_timertrack / o_key_val (parameterized SQL)
  client/
    index.html         mounts the Vue app (Vue loaded from CDN)
    main.js            reactive store, ws wiring, root component
    ws_client.js       connect / reconnect / on / send
    util.js            datetime + duration formatting
    view/              timer / activity_list / track_edit (Composition API components)
  test_smoke.js        end-to-end deno test
  data/                sqlite database (gitignored)
```

### Data model

`o_workspace` (s_uuid) → has many `o_activity` (s_name) → has many `o_timertrack`
(n_ts_ms_start, n_ts_ms_end [null = running], s_notes). `o_key_val` stores per-workspace
settings (activity sort order now; UI window state later).

## Status / roadmap

This is the **Phase 1 MVP**: workspace UUID routing, activity CRUD, start/stop timer
(one active per workspace), editable recorded tracks, sortable activity list.

Deferred (per the design docs):
- Weekly/monthly **calendar view** + **ICS** export (pure JS).
- **PNG / PDF** export via the standardized streaming executable layer (`Deno.Command().spawn()`).
- **Draggable / resizable windows** with UI state persisted in `o_key_val`.

## License

MIT — see [`application/LICENSE`](./application/LICENSE). Every source file starts with
a copyright/license header, per `source_of_truth/architecture/licensing.md`.
