import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class TelevisionService extends BaseService {
    private speakerService;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    private hasCapability;
    getActive(): Promise<CharacteristicValue>;
    setActive(value: CharacteristicValue): Promise<void>;
    getVolume(): Promise<CharacteristicValue>;
    setVolume(value: CharacteristicValue): Promise<void>;
    setVolumeSelector(value: CharacteristicValue): Promise<void>;
    getMute(): Promise<CharacteristicValue>;
    setMute(value: CharacteristicValue): Promise<void>;
    setRemoteKey(value: CharacteristicValue): Promise<void>;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=televisionService.d.ts.map