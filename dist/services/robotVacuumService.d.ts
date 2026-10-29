import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class RobotVacuumService extends BaseService {
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    private hasCapability;
    setVacuumState(value: CharacteristicValue): Promise<void>;
    getVacuumState(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=robotVacuumService.d.ts.map