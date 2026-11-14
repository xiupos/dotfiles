// Result cache (memory + disk) and the debounced, bounded render queue.
// No vscode dependency.

import * as fs from "fs";
import * as path from "path";
import type { RenderResult } from "./tex";

export class ResultCache {
  private mem = new Map<string, RenderResult>();

  constructor(private dir: string) {}

  get(key: string): RenderResult | undefined {
    const hit = this.mem.get(key);
    if (hit) return hit;
    try {
      const r = JSON.parse(fs.readFileSync(this.file(key), "utf8")) as RenderResult;
      this.mem.set(key, r);
      return r;
    } catch {
      return undefined;
    }
  }

  set(key: string, r: RenderResult): void {
    this.mem.set(key, r);
    if (!r.ok && r.transient) return;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const f = this.file(key);
      fs.writeFileSync(f + ".tmp", JSON.stringify(r));
      fs.renameSync(f + ".tmp", f);
    } catch {
      // Disk cache is best effort.
    }
  }

  /** Forget results that should be retried (timeouts, missing commands). */
  dropTransient(): void {
    for (const [k, r] of this.mem) if (!r.ok && r.transient) this.mem.delete(k);
  }

  /** Statistics for tests and the log. */
  get size(): number {
    return this.mem.size;
  }

  clear(): void {
    this.mem.clear();
    fs.rmSync(this.dir, { recursive: true, force: true });
  }

  private file(key: string): string {
    return path.join(this.dir, key + ".json");
  }
}

type Job = () => Promise<RenderResult>;

export class Scheduler {
  private pending = new Map<string, { key: string; timer: NodeJS.Timeout }>();
  private inflight = new Set<string>();
  private queue: { key: string; job: Job }[] = [];
  private running = 0;
  private waiters: (() => void)[] = [];
  /** Number of compilations started (for tests). */
  compiled = 0;

  constructor(
    private cache: ResultCache,
    private concurrency: () => number,
    private onDone: (key: string, r: RenderResult) => void,
  ) {}

  /**
   * Ask for `key` to be rendered for the figure slot `slot` after `delay` ms.
   * A newer request for the same slot replaces an older one that has not started.
   */
  request(slot: string, key: string, delay: number, job: Job): void {
    if (this.inflight.has(key) || this.queue.some((q) => q.key === key)) return;
    const p = this.pending.get(slot);
    if (p) {
      if (p.key === key) return;
      clearTimeout(p.timer);
    }
    const timer = setTimeout(() => {
      this.pending.delete(slot);
      if (this.cache.get(key) || this.inflight.has(key) || this.queue.some((q) => q.key === key)) return this.settle();
      this.queue.push({ key, job });
      this.pump();
    }, delay);
    this.pending.set(slot, { key, timer });
  }

  private pump(): void {
    while (this.running < Math.max(1, this.concurrency()) && this.queue.length) {
      const { key, job } = this.queue.shift()!;
      this.running++;
      this.inflight.add(key);
      this.compiled++;
      job()
        .catch((e): RenderResult => ({ ok: false, transient: true, errors: [{ message: String(e?.message ?? e), excerpt: "" }] }))
        .then((r) => {
          this.cache.set(key, r);
          this.onDone(key, r);
        })
        .finally(() => {
          this.running--;
          this.inflight.delete(key);
          this.pump();
          this.settle();
        });
    }
  }

  get busy(): boolean {
    return this.pending.size > 0 || this.running > 0 || this.queue.length > 0;
  }

  /** Resolves when nothing is pending, queued or running. */
  idle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  private settle(): void {
    if (this.busy) return;
    const w = this.waiters;
    this.waiters = [];
    for (const f of w) f();
  }

  cancelAll(): void {
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    this.queue = [];
    this.settle();
  }
}
