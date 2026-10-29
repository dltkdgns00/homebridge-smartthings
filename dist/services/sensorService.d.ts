import { PlatformAccessory, CharacteristicValue, WithUUID, Characteristic, Service } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
export declare abstract class SensorService extends BaseService {
    statusFailureCount: number;
    statusTranslation: (status: any) => CharacteristicValue | null;
    pollingTimer: ReturnType<typeof setInterval> | void | undefined;
    characteristic: WithUUID<new () => Characteristic> | undefined;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    protected initService(sensorService: WithUUID<typeof Service>, sensorCharacteristic: WithUUID<new () => Characteristic>, statusTranslation: (status: any) => CharacteristicValue): void;
    getSensorState(): Promise<CharacteristicValue>;
}
//# sourceMappingURL=sensorService.d.ts.map