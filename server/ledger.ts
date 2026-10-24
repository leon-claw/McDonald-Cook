import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { ApiError, type Order } from './types.js';

export interface OrderEntry { quoteId: string; requestId: string; createdAt: string; order: Order }
export class OrderLedger {
  private entries = new Map<string, OrderEntry>();
  private writeQueue: Promise<void> = Promise.resolve();
  constructor(private path?: string) {}
  async load() {
    if (!this.path) return;
    try {
      const raw: unknown = JSON.parse(await readFile(this.path, 'utf8'));
      if (!Array.isArray(raw)) throw new Error('invalid ledger');
      for (const entry of raw) {
        if (!entry || typeof entry.quoteId !== 'string' || typeof entry.requestId !== 'string' ||
          !entry.order || typeof entry.order.orderId !== 'string' || !['demo', 'created', 'unknown'].includes(entry.order.status)) {
          throw new Error('invalid ledger entry');
        }
        this.entries.set(entry.quoteId, entry);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('订单记录无法读取，已停止启动以避免重复下单。');
    }
  }
  get(quoteId: string) { return this.entries.get(quoteId); }
  getByOrderId(orderId: string) { return [...this.entries.values()].find(entry => entry.order.orderId === orderId); }
  checkRequestId(requestId: string, quoteId: string) {
    const existing = [...this.entries.values()].find(entry => entry.requestId === requestId);
    if (existing && existing.quoteId !== quoteId) throw new ApiError(409, '此请求编号已用于另一份订单。', 'REQUEST_ID_CONFLICT');
  }
  async put(entry: OrderEntry) {
    this.entries.set(entry.quoteId, entry);
    if (!this.path) return;
    const snapshot = JSON.stringify([...this.entries.values()], null, 2);
    const path = this.path;
    const write = this.writeQueue.then(async () => {
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await writeFile(`${path}.tmp`, snapshot, { mode: 0o600 });
      await rename(`${path}.tmp`, path);
    });
    this.writeQueue = write.catch(() => {});
    try { await write; } catch { throw new ApiError(503, '无法保存订单状态，请稍后查询订单。', 'LEDGER_UNAVAILABLE'); }
  }
}
