import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { MultiServiceAccessory } from './multiServiceAccessory';
/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export declare class IKHomeBridgeHomebridgePlatform implements DynamicPlatformPlugin {
    readonly log: Logger;
    readonly config: PlatformConfig;
    readonly api: API;
    readonly Service: typeof Service;
    readonly Characteristic: typeof Characteristic;
    readonly accessories: PlatformAccessory[];
    private locationIDsToIgnore;
    private roomsIDsToIgnore;
    private headerDict;
    private axInstance;
    private accessoryObjects;
    private subscriptionHandler;
    constructor(log: Logger, config: PlatformConfig, api: API);
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to setup event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory: PlatformAccessory): void;
    getLocationsToIgnore(): Promise<boolean>;
    getOnlineDevices(): Promise<Array<object>>;
    unregisterDevices(devices: any, all?: boolean): void;
    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    discoverDevices(devices: any): void;
    findSupportedCapability(device: any): boolean;
    createAccessoryObject(device: any, accessory: any): MultiServiceAccessory;
}
//# sourceMappingURL=platform.d.ts.map