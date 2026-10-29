import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class FanSpeedService extends BaseService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    setSwitchState(value: CharacteristicValue): Promise<void>;
    getSwitchState(): Promise<CharacteristicValue>;
    setLevel(value: CharacteristicValue): Promise<void>;
    getLevel(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
    private mapLevelToPercent;
}
//# sourceMappingURL=fanSpeedService.d.ts.map