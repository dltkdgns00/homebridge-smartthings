import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class LockService extends BaseService {
    private targetState;
    private lockInTransitionStart;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    getLockTargetState(): Promise<number>;
    setLockTargetState(value: CharacteristicValue): Promise<void>;
    getLockCurrentState(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
    mapLockState(lockState: string): CharacteristicValue;
}
//# sourceMappingURL=lockService.d.ts.map