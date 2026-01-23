export declare enum ApiMessageType {
    WEBSOCKET_MESSAGE = "websocket_message"
}
export declare class ApiMessageBase {
    readonly type: ApiMessageType;
    protected constructor(type: ApiMessageType);
}
export declare class ApiWebsocketMessage extends ApiMessageBase {
    readonly event: string;
    readonly data: string;
    readonly userId?: string | undefined;
    readonly tenantId?: string | undefined;
    constructor(event: string, data: string, userId?: string | undefined, tenantId?: string | undefined);
}
//# sourceMappingURL=index.d.ts.map