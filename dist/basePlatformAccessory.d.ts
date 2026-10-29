import { PlatformAccessory, Logger, API, Characteristic, CharacteristicValue, Service, WithUUID } from 'homebridge';
import { AxiosInstance } from 'axios';
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { ShortEvent } from './webhook/subscriptionHandler';
type DeviceStatus = {
    timestamp: number;
    status: any;
};
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare abstract class BasePlatformAccessory {
    /**
     * These are just used to create a working example
     * You should implement your own code to track the state of your accessory
     */
    protected accessory: PlatformAccessory;
    protected platform: IKHomeBridgeHomebridgePlatform;
    readonly name: string;
    protected characteristic: typeof Characteristic;
    protected log: Logger;
    protected baseURL: string;
    protected key: string;
    protected axInstance: AxiosInstance;
    protected commandURL: string;
    protected statusURL: string;
    protected healthURL: string;
    protected api: API;
    protected online: boolean;
    protected deviceStatus: DeviceStatus;
    protected failureCount: number;
    protected giveUpTime: number;
    protected commandInProgress: boolean;
    protected lastCommandCompleted: number;
    protected statusQueryInProgress: boolean;
    protected lastStatusResult: boolean;
    get id(): string;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory);
    abstract processEvent(event: ShortEvent): void;
    protected refreshStatus(): Promise<boolean>;
    protected startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service, chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>, getTargetState?: () => Promise<CharacteristicValue>): NodeJS.Timer | void;
    sendCommand(capability: string, command: string, args?: unknown[]): Promise<boolean>;
    private waitFor;
}
export {};
//# sourceMappingURL=basePlatformAccessory.d.ts.map