import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class ContactSensorService extends SensorService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=contactSensorService.d.ts.map