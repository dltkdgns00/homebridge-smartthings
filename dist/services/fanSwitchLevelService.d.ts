import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class FanSwitchLevelService extends BaseService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilitites: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    setSwitchState(value: CharacteristicValue): Promise<void>;
    getSwitchState(): Promise<CharacteristicValue>;
    setLevel(value: CharacteristicValue): Promise<void>;
    getLevel(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=fanSwitchLevelService.d.ts.map