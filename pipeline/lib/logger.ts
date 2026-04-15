/**
 * Simple logger with timestamps and module context.
 * Keeps pipeline output readable and debuggable.
 */

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}] [${module}]`;

  if (data) {
    console.log(`${prefix} ${message}`, typeof data === "string" ? data : JSON.stringify(data, null, 2));
  } else {
    console.log(`${prefix} ${message}`);
  }
}

export function createLogger(module: string) {
  return {
    info: (msg: string, data?: unknown) => log("INFO", module, msg, data),
    warn: (msg: string, data?: unknown) => log("WARN", module, msg, data),
    error: (msg: string, data?: unknown) => log("ERROR", module, msg, data),
    debug: (msg: string, data?: unknown) => log("DEBUG", module, msg, data),
  };
}
