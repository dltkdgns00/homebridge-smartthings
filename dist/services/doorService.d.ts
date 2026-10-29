import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class DoorService extends BaseService {
    private targetState;
    private doorInTransitionStart;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    getTargetDoorState(): Promise<CharacteristicValue>;
    setTargetDoorState(value: CharacteristicValue): Promise<void>;
    getCurrentDoorState(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
    private mapDoorState;
}
//# sourceMappingURL=doorService.d.ts.map