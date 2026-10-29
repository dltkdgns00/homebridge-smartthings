import { PlatformAccessory, Logger, Service, WithUUID } from 'homebridge';
import { ShortEvent } from '../webhook/subscriptionHandler';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
export declare class BaseService {
    protected accessory: PlatformAccessory;
    protected log: Logger;
    protected platform: IKHomeBridgeHomebridgePlatform;
    protected name: string;
    protected deviceStatus: any;
    protected multiServiceAccessory: MultiServiceAccessory;
    protected service: Service;
    componentId: string;
    capabilities: string[];
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    protected findCapability(capabilityToFind: string): boolean;
    protected setServiceType(serviceType: WithUUID<typeof Service>): void;
    protected getStatus(): Promise<boolean>;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=baseService.d.ts.map