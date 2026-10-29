import { PlatformAccessory, Characteristic, CharacteristicValue, Service, WithUUID, Logger, API } from 'homebridge';
import { AxiosInstance } from 'axios';
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { ShortEvent } from './webhook/subscriptionHandler';
import { Command } from './services/smartThingsCommand';
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export declare class MultiServiceAccessory {
    components: {
        componentId: string;
        capabilities: string[];
        status: Record<string, unknown>;
    }[];
    private services;
    private static requestQueue;
    private static rateLimitResetTime;
    private static readonly MIN_REQUEST_INTERVAL_MS;
    private static capabilityMap;
    private static comboCapabilityMap;
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
    protected deviceStatusTimestamp: number;
    protected failureCount: number;
    protected giveUpTime: number;
    protected commandInProgress: boolean;
    protected lastCommandCompleted: number;
    protected statusQueryInProgress: boolean;
    protected lastStatusResult: boolean;
    get id(): string;
    constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory);
    private static enqueueStatusRequest;
    private registerServiceIfMatchesCapabilities;
    addComponent(componentId: string, capabilities: string[]): void;
    isOnline(): boolean;
    static capabilitySupported(capability: string): boolean;
    private hasCachedStatus;
    refreshStatus(): Promise<boolean>;
    forceNextStatusRefresh(): void;
    startPollingState(pollSeconds: number, getValue: () => Promise<CharacteristicValue>, service: Service, chracteristic: WithUUID<new () => Characteristic>, targetStateCharacteristic?: WithUUID<new () => Characteristic>, getTargetState?: () => Promise<CharacteristicValue>): ReturnType<typeof setInterval> | void;
    sendCommand(capability: string, command: string, args?: unknown[]): Promise<boolean>;
    sendCommands(commands: Command[]): Promise<boolean>;
    private waitFor;
    processEvent(event: ShortEvent): void;
}
//# sourceMappingURL=multiServiceAccessory.d.ts.map