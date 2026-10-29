import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { SensorService } from './sensorService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class HumidityService extends SensorService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilitites: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=humidityService.d.ts.map