import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class MotionService extends SensorService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=motionService.d.ts.map