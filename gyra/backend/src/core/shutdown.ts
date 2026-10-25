import type { Logger } from "./logger/logger";

const FORCE_EXIT_AFTER_MS = 10_000;

/**
 * Runs `cleanup` once on SIGTERM/SIGINT (docker stop sends SIGTERM), then exits.
 * Exits with code 1 if cleanup fails or takes longer than 10 seconds.
 */
export function onShutdown(logger: Logger, cleanup: () => Promise<void>): void {
  let shuttingDown = false;

  const shutdown = async (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    const forceExit = setTimeout(() => {
      logger.error("shutdown timed out, forcing exit");
      process.exit(1);
    }, FORCE_EXIT_AFTER_MS);
    forceExit.unref();

    try {
      await cleanup();
      logger.info("shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.error({ err }, "shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  // A crash leaves the process in an unknown state: log it and exit so Docker restarts it.
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "unhandled promise rejection");
    process.exit(1);
  });
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "uncaught exception");
    process.exit(1);
  });
}
