import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class LightService extends BaseService {
    currentColor: {
        hue: number;
        saturation: number;
    };
    requireSetColor: boolean;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    setSwitchState(value: CharacteristicValue): Promise<void>;
    getSwitchState(): Promise<CharacteristicValue>;
    setLevel(value: CharacteristicValue): Promise<void>;
    getLevel(): Promise<CharacteristicValue>;
    setColorTemp(value: CharacteristicValue): Promise<void>;
    getColorTemp(): Promise<CharacteristicValue>;
    setColor(hue: number, saturation: number): Promise<boolean>;
    setHue(value: CharacteristicValue): Promise<void>;
    getHue(): Promise<CharacteristicValue>;
    setSaturation(value: CharacteristicValue): Promise<void>;
    getSaturation(): Promise<CharacteristicValue>;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=lightService.d.ts.map