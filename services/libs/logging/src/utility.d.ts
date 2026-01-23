import { Logger } from './types';
export declare const logExecutionTime: <T>(process: () => Promise<T>, log: Logger, name: string) => Promise<T>;
export declare const logExecutionTimeV2: <T>(process: () => Promise<T>, log: Logger, name: string) => Promise<T>;
//# sourceMappingURL=utility.d.ts.map