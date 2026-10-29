import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
export interface ShortEvent {
    deviceId: string;
    value: any;
    componentId: string;
    capability: string;
    attribute: string;
}
export interface RequestBody {
    timeout: number;
    deviceIds: string[];
}
export interface ResponseBody {
    timeout: boolean;
    events: ShortEvent[];
}
export declare class SubscriptionHandler {
    private config;
    private devices;
    private deviceIds;
    private log;
    private shutdown;
    private axInstance;
    constructor(platform: IKHomeBridgeHomebridgePlatform, devices: MultiServiceAccessory[]);
    startService(): Promise<void>;
    stopService(): void;
}
//# sourceMappingURL=subscriptionHandler.d.ts.map