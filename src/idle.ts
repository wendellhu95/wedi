export interface IdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining(): DOMHighResTimeStamp;
}

export type DisposableCallback = () => void;

/**
 * This run the callback when CPU is idle. Will fallback to setTimeout if
 * the browser doesn't support requestIdleCallback.
 */
export let runWhenIdle: (
  callback: (idle?: IdleDeadline) => void,
  timeout?: number
) => DisposableCallback;

// Declare global variables because apparently the type file doesn't have it, for now.
declare function requestIdleCallback(
  callback: (args: IdleDeadline) => void,
  options?: { timeout: number }
): number;
declare function cancelIdleCallback(handle: number): void;

// Use an IIFE to set up runWhenIdle
(function() {
  if (
    typeof requestIdleCallback !== 'undefined' &&
    typeof cancelIdleCallback !== 'undefined'
  ) {
    // Use native requestIdleCallback.
    runWhenIdle = (runner, timeout?) => {
      const handle: number = requestIdleCallback(
        runner,
        typeof timeout === 'number' ? { timeout } : undefined
      );
      let disposed = false;
      return () => {
        if (disposed) {
          return;
        }
        disposed = true;
        clearTimeout(handle);
      };
    };
  } else {
    // Use setTimeout as hack.
    const dummyIdle: IdleDeadline = Object.freeze({
      didTimeout: true,
      timeRemaining() {
        return 15;
      }
    });
    runWhenIdle = (runner) => {
      const handle = setTimeout(() => runner(dummyIdle));
      let disposed = false;
      return () => {
        if (disposed) {
          return;
        }
        disposed = true;
        clearTimeout(handle);
      };
    };
  }
})();

/**x
 * A wrapper of a executor so it can be evaluated when it's necessary or the CPU is idle.
 *
 * The type of the returned value of the executor would be T.
 */
export class IdleValue<T> {
  private readonly executor: () => void;
  private value?: T;

  private didRun: boolean = false;
  private error?: Error;
  private readonly disposeCallback: () => void;

  constructor(executor: () => T) {
    this.executor = () => {
      try {
        this.value = executor();
      } catch (err) {
        this.error = err;
      } finally {
        this.didRun = true;
      }
    };
    this.disposeCallback = runWhenIdle(() => this.executor());
  }

  dispose(): void {
    this.disposeCallback();
  }

  getValue(): T {
    if (!this.didRun) {
      this.dispose();
      this.executor();
    }
    if (this.error) {
      throw this.error;
    }
    return this.value!;
  }
}
