import { environment } from "@raycast/api";
import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";

const LOCK_RETRY_DELAY_MS = 120;
const LOCK_TIMEOUT_MS = 8_000;
const LOCK_STALE_AFTER_MS = 5 * 60 * 1_000;

type LockPayload = {
  pid: number;
  createdAt: number;
};

export async function withDailyNoteLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });

  const lockPath = path.join(environment.supportPath, "daily-note.lock");
  const start = Date.now();

  while (true) {
    try {
      const handle = await open(lockPath, "wx");

      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, createdAt: Date.now() } satisfies LockPayload));
        return await operation();
      } finally {
        await handle.close();
        await rm(lockPath, { force: true });
      }
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
      if (code !== "EEXIST") {
        throw error;
      }

      if (await removeStaleLock(lockPath)) {
        continue;
      }

      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        throw new Error("等待本地写入锁超时，请稍后再试。");
      }

      await delay(LOCK_RETRY_DELAY_MS);
    }
  }
}

async function removeStaleLock(lockPath: string): Promise<boolean> {
  if (!(await isStaleLock(lockPath))) {
    return false;
  }

  await rm(lockPath, { force: true });
  return true;
}

async function isStaleLock(lockPath: string): Promise<boolean> {
  let raw: string;

  try {
    raw = await readFile(lockPath, "utf8");
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return code === "ENOENT";
  }

  let payload: Partial<LockPayload>;
  try {
    payload = JSON.parse(raw) as Partial<LockPayload>;
  } catch {
    return isLockFileOlderThan(lockPath, LOCK_TIMEOUT_MS);
  }

  if (typeof payload.pid !== "number" || typeof payload.createdAt !== "number") {
    return isLockFileOlderThan(lockPath, LOCK_TIMEOUT_MS);
  }

  if (Date.now() - payload.createdAt > LOCK_STALE_AFTER_MS) {
    return true;
  }

  return !isProcessAlive(payload.pid);
}

async function isLockFileOlderThan(lockPath: string, ageMs: number): Promise<boolean> {
  try {
    const fileStat = await stat(lockPath);
    return Date.now() - fileStat.mtimeMs > ageMs;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return code === "ENOENT";
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    return code !== "ESRCH";
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
