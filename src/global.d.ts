declare const __DEV__: boolean;

declare class BdApi {
  constructor(pluginName: string);
  readonly Data: {
    load<T>(key: string): T;
    save(key: string, value: unknown): void;
  };
  readonly DOM: {
    addStyle(css: string): void;
    removeStyle(): void;
  };
  readonly Logger: {
    info(...values: unknown[]): void;
    warn(...values: unknown[]): void;
    error(...values: unknown[]): void;
  };
  readonly UI: {
    showToast(message: string, options?: {type?: "info" | "success" | "warning" | "error"; timeout?: number}): void;
  };
  readonly Webpack: {
    getStore(name: string): any;
    getByKeys?: (...keys: string[]) => any;
    getByStrings?: (...values: any[]) => any;
    getModule(filter: (module: any) => boolean, options?: Record<string, unknown>): any;
  };
}
