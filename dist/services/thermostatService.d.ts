import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
export declare class ThermostatService extends BaseService {
    targetHeatingCoolingState: any;
    targetTemperature: number;
    units: string;
    supportsOperatingState: boolean;
    supportsCooling: boolean;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[], multiServiceAccessory: MultiServiceAccessory, name: string, deviceStatus: any);
    private hasCapability;
    getTargetHeatingCoolingState(): Promise<CharacteristicValue>;
    setTargetHeatingCoolingState(value: CharacteristicValue): Promise<void>;
    getCurrentHeatingCoolingState(): Promise<CharacteristicValue>;
    getCurrentTemperature(): Promise<CharacteristicValue>;
    getTargetTemperature(): Promise<CharacteristicValue>;
    setTargetTemperature(value: CharacteristicValue): Promise<void>;
    getTemperatureDisplayUnits(): CharacteristicValue;
    setTemperatureDisplayUnits(value: CharacteristicValue): void;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=thermostatService.d.ts.map