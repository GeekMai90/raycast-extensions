import { environment } from "@raycast/api";
import { mkdir, open, rm } from "node:fs/promises";
import path from "node:path";

const LOCK_RETRY_DELAY_MS = 120;
const LOCK_TIMEOUT_MS = 8_000;

export async function withDailyNoteLock<T>(operation: () => Promise<T>): Promise<T> {
  await mkdir(environment.supportPath, { recursive: true });

  const lockPath = path.join(environment.supportPath, "daily-note.lock");
  const start = Date.now();

  while (true) {
    try {
      const handle = await open(lockPath, "wx");

      try {
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

      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        throw new Error("等待本地写入锁超时，请稍后再试。");
      }

      await delay(LOCK_RETRY_DELAY_MS);
    }
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
