// Render results (memory + disk) and the debounced, bounded compile queue. No vscode dependency.

import * as fs from "node:fs";
import * as path from "node:path";
import type { RenderResult } from "./tex.ts";

export class ResultCache {
  dir: string;
  private mem = new Map<string, RenderResult>();

  constructor(dir: string) {
    this.dir = dir;
  }

  get(key: string): RenderResult | undefined {
    if (!this.mem.has(key)) {
      try {
        this.mem.set(key, JSON.parse(fs.readFileSync(path.join(this.dir, key + ".json"), "utf8")));
      } catch {
        return undefined;
      }
    }
    return this.mem.get(key);
  }

  set(key: string, r: RenderResult): void {
    this.mem.set(key, r);
    if (!r.ok && r.transient) return;
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(path.join(this.dir, key + ".json"), JSON.stringify(r));
  }

  /** Forget failures worth retrying (missing commands, timeouts). */
  dropTransient(): void {
    for (const [k, r] of this.mem) if (!r.ok && r.transient) this.mem.delete(k);
  }

  clear(): void {
    this.mem.clear();
    fs.rmSync(this.dir, { recursive: true, force: true });
  }
}

/**
 * Compiles `key` for a figure `slot` after `delay` ms; a newer request for the
 * same slot replaces one that has not started. At most `concurrency()` run at once.
 */
export class Scheduler {
  private pending = new Map<string, { key: string; timer: NodeJS.Timeout }>();
  private queue: { key: string; job: () => Promise<RenderResult> }[] = [];
  private running = new Set<string>();
  cache: ResultCache;
  concurrency: () => number;
  onDone: (r: RenderResult) => void;

  constructor(cache: ResultCache, concurrency: () => number, onDone: (r: RenderResult) => void) {
    this.cache = cache;
    this.concurrency = concurrency;
    this.onDone = onDone;
  }

  request(slot: string, key: string, delay: number, job: () => Promise<RenderResult>): void {
    if (this.pending.get(slot)?.key === key || this.scheduled(key)) return;
    clearTimeout(this.pending.get(slot)?.timer);
    const timer = setTimeout(() => {
      this.pending.delete(slot);
      if (this.cache.get(key) || this.scheduled(key)) return;
      this.queue.push({ key, job });
      this.pump();
    }, delay);
    this.pending.set(slot, { key, timer });
  }

  private scheduled(key: string): boolean {
    return this.running.has(key) || this.queue.some((q) => q.key === key);
  }

  private pump(): void {
    while (this.running.size < Math.max(1, this.concurrency()) && this.queue.length) {
      const { key, job } = this.queue.shift()!;
      this.running.add(key);
      job()
        .catch((e): RenderResult => ({ ok: false, message: String(e?.message ?? e), detail: "", transient: "error" }))
        .then((r) => (this.cache.set(key, r), this.onDone(r)))
        .finally(() => (this.running.delete(key), this.pump()));
    }
  }

  cancelAll(): void {
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    this.queue = [];
  }
}
