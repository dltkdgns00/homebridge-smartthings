import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class StatelessProgrammableSwitchService extends BaseService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    getSwitchState(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
    private mapValue;
}
//# sourceMappingURL=statelessProgrammableSwitchService.d.ts.map