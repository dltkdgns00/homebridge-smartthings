import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class SwitchService extends BaseService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    setSwitchState(value: CharacteristicValue): Promise<void>;
    getSwitchState(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=switchService.d.ts.map