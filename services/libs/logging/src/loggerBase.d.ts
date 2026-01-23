import { Logger } from './types';
export declare abstract class LoggerBase {
    protected log: Logger;
    protected constructor();
    protected constructor(logProperties: Record<string, unknown>);
    protected constructor(parentLog: Logger);
    protected constructor(parentLog: Logger, logProperties: Record<string, unknown>);
}
//# sourceMappingURL=loggerBase.d.ts.map