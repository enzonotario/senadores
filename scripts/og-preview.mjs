#!/usr/bin/env node
/**
 * Lista URLs de ejemplo para probar OG images (Takumi / Nuxt OG Image) en local.
 *
 * Uso (con `pnpm dev` corriendo en :3200):
 *   pnpm og:preview
 *
 * Opciones:
 *   --base http://127.0.0.1:3200
 *   --no-fetch   solo imprime páginas candidatas (sin pegarle al server)
 *
 * Nota: usa `curl` (no fetch) porque el header Host es forbidden en undici.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (() => {
  const i = process.argv.indexOf("--base");
  return i >= 0 ? process.argv[i + 1] : "http://127.0.0.1:3200";
})();
const NO_FETCH = process.argv.includes("--no-fetch");
const CURL_MAX_TIME = "25";

/** @typedef {{ chamber: string; label: string; path: string }} Sample */

/** @type {Sample[]} */
const SAMPLES = [
  { chamber: "diputados", label: "Home", path: "/" },
  { chamber: "diputados", label: "Votaciones", path: "/actas" },
  {
    chamber: "diputados",
    label: "Acta afirmativa",
    path: "/actas/5959",
  },
  {
    chamber: "diputados",
    label: "Bloque LLA",
    path: "/diputados/bloques/la-libertad-avanza",
  },
  { chamber: "senadores", label: "Home", path: "/" },
  { chamber: "senadores", label: "Votaciones", path: "/actas" },
  {
    chamber: "senadores",
    label: "Acta afirmativa",
    path: "/actas/2618",
  },
  { chamber: "senadores", label: "Senador ejemplo", path: "/senadores/578" },
  { chamber: "senadores", label: "Partidos", path: "/senadores/partidos" },
];

function hostFor(chamber) {
  return `${chamber}.localhost`;
}

function pageUrl(sample) {
  const u = new URL(BASE);
  return `${u.protocol}//${hostFor(sample.chamber)}${u.port ? `:${u.port}` : ""}${sample.path}`;
}

function curl(url, host) {
  const dir = mkdtempSync(join(tmpdir(), "og-preview-"));
  const bodyPath = join(dir, "body.html");
  try {
    const statusRaw = execFileSync(
      "curl",
      [
        "-sS",
        "--max-time",
        CURL_MAX_TIME,
        "-o",
        bodyPath,
        "-w",
        "%{http_code}",
        "-H",
        `Host: ${host}`,
        url,
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 },
    );
    const status = Number(String(statusRaw).trim()) || 0;
    const buf = readFileSync(bodyPath);
    const body = buf
      .subarray(0, Math.min(buf.length, 256 * 1024))
      .toString("utf8");
    return { status, body };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function extractOgImage(html) {
  const m =
    html.match(
      /property=["']og:image["']\s+content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    );
  return m?.[1] || "";
}

function decodeOgPropValue(raw) {
  if (raw == null || raw === "") return "";
  let v = String(raw).replace(/\.png$/i, "");
  if (v.startsWith("~")) {
    try {
      const b64 = v.slice(1).replace(/-/g, "+").replace(/_/g, "/");
      const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
      return Buffer.from(b64 + pad, "base64").toString("utf8");
    } catch {
      return v;
    }
  }
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v.replace(/\+/g, " ");
  }
}

function parseOgProps(ogImageUrl) {
  /** @type {Record<string, string>} */
  const props = {};
  if (!ogImageUrl) return props;
  let path = ogImageUrl;
  try {
    path = new URL(ogImageUrl).pathname;
  } catch {
    /* relative */
  }
  const comma = path.indexOf(",");
  if (comma < 0) return props;
  const payload = path.slice(comma + 1).replace(/\.png$/i, "");
  for (const part of payload.split(",")) {
    const eq = part.indexOf("_");
    if (eq <= 0) continue;
    const key = part.slice(0, eq);
    if (key === "s" || key === "p" || key === "c") continue;
    props[key] = decodeOgPropValue(part.slice(eq + 1));
  }
  return props;
}

function rewriteOgForCurl(ogImage) {
  if (!ogImage) return "";
  try {
    const base = new URL(BASE);
    const u = new URL(ogImage);
    u.protocol = base.protocol;
    u.hostname = base.hostname;
    u.port = base.port;
    return u.toString();
  } catch {
    if (ogImage.startsWith("/")) return `${BASE.replace(/\/$/, "")}${ogImage}`;
    return ogImage;
  }
}

function fetchSample(sample) {
  const url = `${BASE.replace(/\/$/, "")}${sample.path}`;
  const { status, body } = curl(url, hostFor(sample.chamber));
  return {
    ok: status >= 200 && status < 400,
    status,
    ogImage: extractOgImage(body),
  };
}

function printItem(n, sample, extra = {}) {
  const host = hostFor(sample.chamber);
  console.log(`[${n}] ${sample.chamber} — ${sample.label}`);
  console.log(`    página: ${pageUrl(sample)}`);
  if (extra.error) {
    console.log(`    error:  ${extra.error}`);
  } else {
    if (extra.title) console.log(`    título: ${extra.title}`);
    if (extra.badge) console.log(`    badge:  ${extra.badge}`);
    if (extra.accent) console.log(`    accent: ${extra.accent}`);
    if (extra.ogUrl) {
      console.log(
        `    curl -sS -H 'Host: ${host}' '${extra.ogUrl}' -o /tmp/og-${n}.png && xdg-open /tmp/og-${n}.png`,
      );
    }
  }
  console.log("");
}

function main() {
  console.log(`OG preview — ${BASE} (Host: *.localhost)\n`);

  if (NO_FETCH) {
    SAMPLES.forEach((s, i) => printItem(i + 1, s));
    return;
  }

  for (const [i, sample] of SAMPLES.entries()) {
    const n = i + 1;
    process.stderr.write(`· ${sample.chamber} ${sample.path} … `);
    try {
      const r = fetchSample(sample);
      process.stderr.write(r.ok ? "ok\n" : `fail ${r.status}\n`);
      const og = rewriteOgForCurl(r.ogImage);
      const props = parseOgProps(og || r.ogImage);
      printItem(n, sample, {
        title: props.title,
        badge: props.badge,
        accent: props.accent,
        ogUrl: og || undefined,
      });
    } catch (e) {
      const msg = String(e?.stderr || e?.message || e);
      const timedOut = /timed out|exit code 28/i.test(msg);
      const down = /Failed to connect|Empty reply|Connection refused/i.test(
        msg,
      );
      process.stderr.write(timedOut ? "timeout\n" : down ? "down\n" : "error\n");
      printItem(n, sample, {
        error: down
          ? "dev server no responde — corré pnpm dev"
          : timedOut
            ? `timeout ${CURL_MAX_TIME}s`
            : msg.replace(/\s+/g, " ").slice(0, 100),
      });
    }
  }
}

main();
