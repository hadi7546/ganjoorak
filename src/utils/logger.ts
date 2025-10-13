const isDev = process.env.NODE_ENV !== 'production';

const createLoggerMethod = <T extends (...args: any[]) => void>(method: T) =>
  (...args: Parameters<T>) => {
    if (isDev) {
      method(...args);
    }
  };

export const logger = {
  log: createLoggerMethod(console.log),
  info: createLoggerMethod(console.info),
  warn: createLoggerMethod(console.warn),
  error: createLoggerMethod(console.error),
};

export type Logger = typeof logger;
