// From Primitives (fragiola/primitives, site/dev.ts), same author and licence (itself from Tree's
// and Dockable's).
//
// `pnpm site:dev [--base /<slug>] [--port <n>]`: serves every framework's embed app with hot
// reload under `<base>/embed/<framework>/` on one port (default 5192, base /calendar), so
// fragiola.com in dev (`www`) can proxy `/<slug>/embed/**` here. Each framework of project.json
// gets its app's own dev server (`pnpm --filter examples-<framework> dev`, with `EMBED_BASE` and
// `PORT`) on a free port, behind a Node proxy on `--port` (dev-proxy.ts) that routes requests and
// hot-reload WebSockets by path. The dev servers serve the packages from their sources (the source
// condition), so a change to the core or a primitive reloads too. Each embed serves its manifest
// (`<base>/embed/<framework>/manifest.json`), rebuilt per request.

import { type ChildProcess, spawn } from "node:child_process";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
    createDevProxy,
    DEV_PORT,
    exitCodeOf,
    freePort,
    parsePort,
    type Upstream,
} from "./dev-proxy.ts";
import {
    baseProblem,
    embedBuilds,
    frameworksOf,
    normalizeBase,
    readProject,
} from "./sources.ts";

const project = readProject();
const { values } = parseArgs({
    options: {
        base: { type: "string", default: `/${project.slug}` },
        port: { type: "string", default: String(DEV_PORT) },
    },
});
const base = normalizeBase(values.base);
const port = parsePort(values.port);
const problem =
    baseProblem(base, project.slug) ??
    (port === undefined
        ? `--port ${values.port}: an integer from 1 to 65535`
        : undefined);
if (problem !== undefined || port === undefined) {
    console.error(`site:dev: ${problem}`);
    process.exit(1);
}

const children: ChildProcess[] = [];
const upstreams: Upstream[] = [];
let stopping = false;
const stop = (code: number) => {
    if (stopping) return;
    stopping = true;
    // each dev server runs in its own process group (pnpm, then vite): end the whole group
    for (const child of children) {
        if (child.pid === undefined) continue;
        try {
            process.kill(-child.pid, "SIGTERM");
        } catch {
            // already gone
        }
    }
    process.exit(code);
};

// the out directory is unused in dev: only the package and the base of each embed matter
for (const embed of embedBuilds(frameworksOf(project), base, "")) {
    const upstream = { prefix: embed.base, port: await freePort() };
    const child = spawn("pnpm", ["--filter", embed.package, "dev"], {
        cwd: resolve(import.meta.dirname, ".."),
        stdio: "inherit",
        detached: true,
        env: {
            ...process.env,
            EMBED_BASE: embed.base,
            PORT: String(upstream.port),
        },
    });
    // one embed gone is the whole dev site broken: stop the others too
    // (a dev server killed by a signal is a failure: a non-zero exit)
    child.on("exit", (code, signal) => stop(exitCodeOf(code, signal)));
    children.push(child);
    upstreams.push(upstream);
}

createDevProxy(upstreams).listen(port, () => {
    for (const upstream of upstreams) {
        console.log(
            `site:dev: http://localhost:${port}${upstream.prefix} → dev server on ${upstream.port}`,
        );
    }
});
for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => stop(0));
}
