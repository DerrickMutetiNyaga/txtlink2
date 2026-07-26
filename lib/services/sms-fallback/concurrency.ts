/**
 * Run async work over items with a fixed concurrency pool.
 * Safe for Node's single-threaded event loop (index increment is not raced).
 */
export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) return []

  const results = new Array<R>(items.length)
  let nextIndex = 0
  const poolSize = Math.min(Math.max(concurrency, 1), items.length)

  async function runWorker(): Promise<void> {
    while (true) {
      const index = nextIndex++
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: poolSize }, () => runWorker()))
  return results
}
