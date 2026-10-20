import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import AdmZip from "adm-zip";

const root = process.cwd();
let temporary, fixture, processHandle, origin, cookie;
const request = (url, options = {}) => fetch(origin + url, { ...options, headers: { cookie, ...options.headers } });
const json = (url, method, body) => request(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const settings = {
  "server-name": "Test server",
  "level-name": "original",
  gamemode: "survival",
  difficulty: "normal",
  "max-players": "10",
  "server-port": "29132",
  "server-portv6": "29133",
  "online-mode": "true",
  "allow-list": "true",
};
const packId = "44af8350-43c3-4b62-b061-444444444444";
const manifest = { header: { uuid: packId, name: "<img src=x onerror=alert(1)>", version: [1, 0, 0] }, modules: [{ type: "resources" }] };
before(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), "bedrock-dashboard-test-"));
  const build = path.join(temporary, "build");
  fixture = path.join(temporary, "fixture");
  execFileSync(process.execPath, ["node_modules/astro/bin/astro.mjs", "build", "--outDir", build], { cwd: root, stdio: "pipe" });
  await symlink(path.join(root, "node_modules"), path.join(build, "node_modules"), "dir");
  await mkdir(path.join(fixture, "bedrock-server", "worlds", "original"), { recursive: true });
  await mkdir(path.join(fixture, "bin"), { recursive: true });
  await writeFile(
    path.join(fixture, "bedrock-server", "server.properties"),
    Object.entries(settings)
      .map(([key, value]) => `${key}=${value}`)
      .join("\n")
  );
  await writeFile(path.join(fixture, "bedrock-server", "worlds", "original", "level.dat"), "test world data");
  // Stub process discovery. No test can take over a real server on this host.
  await writeFile(path.join(fixture, "bin", "ss"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  await writeFile(
    path.join(fixture, "bedrock-server", "bedrock_server"),
    '#!/bin/sh\nprintf "Server started.\\n"\nwhile IFS= read -r cmd; do\n if [ "$cmd" = "stop" ]; then exit 0; fi\n printf "%s\\n" "$cmd"\ndone\n',
    { mode: 0o755 }
  );
  processHandle = spawn(process.execPath, [path.join(build, "server", "entry.mjs")], {
    cwd: fixture,
    env: {
      ...process.env,
      NODE_ENV: "development",
      HOST: "127.0.0.1",
      PORT: "0",
      ADMIN_USERNAME: "integration-admin",
      ADMIN_PASSWORD: "integration-password",
      PATH: `${path.join(fixture, "bin")}:${process.env.PATH}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Test server startup timed out")), 15000);
    processHandle.stdout.on("data", (chunk) => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    processHandle.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Test server exited: ${code}`));
    });
  });
  const response = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "integration-admin", password: "integration-password" }),
  });
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie").split(";")[0];
});
after(async () => {
  if (processHandle && processHandle.exitCode === null) {
    try {
      await json("/api/server/control", "POST", { action: "stop" });
    } catch {}
    const exited = once(processHandle, "exit");
    processHandle.kill();
    await exited;
  }
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

test("API requires authentication", async () => {
  assert.equal((await fetch(origin + "/api/overview")).status, 401);
});
test("overview returns live settings, metrics and world state", async () => {
  const response = await request("/api/overview");
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.settings["level-name"], "original");
  assert.equal(data.worlds[0].active, true);
  assert.equal(typeof data.metrics.cpuPercent, "number");
});
test("all dashboard routes render", async () => {
  for (const route of ["/dashboard", "/dashboard/worlds", "/dashboard/addons", "/dashboard/players", "/dashboard/settings", "/dashboard/setup", "/dashboard/server"])
    assert.equal((await request(route)).status, 200, route);
});
test("settings reject newline injection, non-string values and unknown keys", async () => {
  for (const payload of [{ "server-name": "test\nonline-mode=false" }, { "max-players": null }, { "unknown-setting": "x" }])
    assert.equal((await json("/api/settings", "PUT", payload)).status, 400);
  const data = await (await request("/api/settings")).json();
  assert.equal(data.settings["server-name"], "Test server");
});
test("world paths cannot traverse the world directory", async () => {
  for (const name of ["../escape", "..", "a/b", "bad\nname"]) {
    assert.equal((await json("/api/worlds", "POST", { worldName: name })).status, 400);
    assert.equal((await json("/api/worlds", "DELETE", { worldName: name })).status, 400);
    assert.equal((await request("/api/worlds/export?name=" + encodeURIComponent(name))).status, 400);
  }
});
test("create world preserves old world, selects new one and rejects duplicates", async () => {
  const payload = { action: "create", settings: { "level-name": "new-world", gamemode: "creative", difficulty: "peaceful" } };
  const response = await json("/api/worlds", "POST", payload);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.worlds.length, 2);
  assert.equal(data.worlds.find((w) => w.name === "new-world").active, true);
  assert.equal((await json("/api/worlds", "POST", payload)).status, 400);
  assert.equal(await readFile(path.join(fixture, "bedrock-server/worlds/original/level.dat"), "utf8"), "test world data");
});
test("invalid settings roll back a newly reserved world directory", async () => {
  assert.equal((await json("/api/worlds", "POST", { action: "create", settings: { "level-name": "invalid-world", gamemode: "invalid" } })).status, 400);
  assert.ok(!(await readdir(path.join(fixture, "bedrock-server/worlds"))).includes("invalid-world"));
});
test("active world cannot be deleted; ungenerated world cannot be exported", async () => {
  assert.equal((await json("/api/worlds", "DELETE", { worldName: "new-world" })).status, 400);
  assert.equal((await request("/api/worlds/export?name=new-world")).status, 400);
});
test("world with embedded pack imports and exports without dropping data", async () => {
  const zip = new AdmZip();
  zip.addFile("level.dat", Buffer.from("imported data"));
  zip.addFile("resource_packs/custom/manifest.json", Buffer.from(JSON.stringify(manifest)));
  const form = new FormData();
  form.append("file", new File([zip.toBuffer()], "imported.mcworld"));
  assert.equal((await request("/api/worlds", { method: "POST", body: form })).status, 200);
  const response = await request("/api/worlds/export?name=imported");
  assert.equal(response.status, 200);
  const exported = new AdmZip(Buffer.from(await response.arrayBuffer()));
  assert.equal(exported.readAsText("level.dat"), "imported data");
  assert.ok(exported.getEntry("resource_packs/custom/manifest.json"));
});
test("global addon toggles and is included in world export", async () => {
  await json("/api/worlds", "POST", { worldName: "original" });
  const zip = new AdmZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest)));
  const form = new FormData();
  form.append("file", new File([zip.toBuffer()], "custom.mcpack"));
  assert.equal((await request("/api/packs", { method: "POST", body: form })).status, 200);
  assert.equal((await json("/api/packs/toggle", "POST", { type: "resource", packId, version: "9.9.9", enabled: true })).status, 200);
  const packs = await (await request("/api/packs")).json();
  assert.equal(packs.resource[0].enabled, true);
  const response = await request("/api/worlds/export?name=original");
  const zipExport = new AdmZip(Buffer.from(await response.arrayBuffer()));
  const refs = JSON.parse(zipExport.readAsText("world_resource_packs.json"));
  assert.deepEqual(refs[0].version, [1, 0, 0]);
  assert.ok(zipExport.getEntries().some((entry) => entry.entryName.startsWith("resource_packs/") && entry.entryName.endsWith("manifest.json")));
});
test("running server blocks world changes, exports and addon mutations", async () => {
  assert.equal((await json("/api/server/control", "POST", { action: "start" })).status, 200);
  for (const [url, method, payload] of [
    ["/api/worlds", "POST", { worldName: "imported" }],
    ["/api/worlds", "DELETE", { worldName: "imported" }],
    ["/api/worlds", "POST", { action: "create", settings: { "level-name": "blocked" } }],
    ["/api/packs/toggle", "POST", { type: "resource", packId, version: "1.0.0", enabled: false }],
    ["/api/packs/delete", "POST", { type: "resource", packId }],
  ])
    assert.equal((await json(url, method, payload)).status, 400, url);
  assert.equal((await request("/api/worlds/export?name=original")).status, 400);
  assert.equal((await json("/api/server/control", "POST", { action: "stop" })).status, 200);
});
test("world switching and deletion work after server stops", async () => {
  assert.equal((await json("/api/worlds", "POST", { worldName: "new-world" })).status, 200);
  assert.equal((await json("/api/worlds", "DELETE", { worldName: "imported" })).status, 200);
  const data = await (await request("/api/worlds")).json();
  assert.ok(!data.worlds.some((w) => w.name === "imported"));
});
