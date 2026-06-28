import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

export async function getDuckDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

    const worker_url = URL.createObjectURL(
      new Blob([`importScripts("${bundle.mainWorker}");`], {
        type: "text/javascript",
      }),
    );
    const worker = new Worker(worker_url);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    URL.revokeObjectURL(worker_url);
    return db;
  })();

  return initPromise;
}

export function getDuckDBSync(): duckdb.AsyncDuckDB | null {
  return db;
}

export async function closeDuckDB(): Promise<void> {
  if (db) {
    await db.terminate();
    db = null;
    initPromise = null;
  }
}
