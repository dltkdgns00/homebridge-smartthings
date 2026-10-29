import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
export declare class BatteryService extends BaseService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    getBatteryLevel(): Promise<CharacteristicValue>;
    getStatusLowBattery(): Promise<CharacteristicValue>;
}
//# sourceMappingURL=batteryService.d.ts.map