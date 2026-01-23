import { Logger } from './types';
export declare const getServiceLogger: () => Logger;
export declare const getChildLogger: (name: string, parent: Logger, logProperties?: Record<string, unknown>) => Logger;
export declare const getServiceChildLogger: (name: string, logProperties?: Record<string, unknown>) => Logger;
//# sourceMappingURL=logger.d.ts.map