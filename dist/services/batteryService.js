"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatteryService = void 0;
const baseService_1 = require("./baseService");
class BatteryService extends baseService_1.BaseService {
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.setServiceType(platform.Service.Battery);
        this.log.debug(`Adding BatteryService to ${this.name}`);
        this.service.getCharacteristic(platform.Characteristic.BatteryLevel)
            .onGet(this.getBatteryLevel.bind(this));
        this.service.getCharacteristic(platform.Characteristic.StatusLowBattery)
            .onGet(this.getStatusLowBattery.bind(this));
        let pollSensorSeconds = 5; // default to 10 seconds
        if (this.platform.config.PollSensorsSeconds !== undefined) {
            pollSensorSeconds = this.platform.config.PollSensorsSeconds;
        }
        if (pollSensorSeconds > 0) {
            multiServiceAccessory.startPollingState(pollSensorSeconds, this.getBatteryLevel.bind(this), this.service, platform.Characteristic.BatteryLevel);
        }
    }
    async getBatteryLevel() {
        // if you need to return an error to show the device as "Not Responding" in the Home app:
        // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        this.log.debug('Received getBatteryLevel() event for ' + this.name);
        return new Promise((resolve, reject) => {
            this.getStatus().then(success => {
                if (success) {
                    const batteryLevel = this.deviceStatus.status.battery.battery.value;
                    if (batteryLevel === null) {
                        return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                    }
                    this.log.debug(`Battery value from ${this.name}: ${batteryLevel}`);
                    resolve(batteryLevel);
                }
                else {
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
    async getStatusLowBattery() {
        // if you need to return an error to show the device as "Not Responding" in the Home app:
        // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        this.log.debug('Received getStatusLowBattery() event for ' + this.name);
        return new Promise((resolve, reject) => {
            this.getStatus().then(success => {
                if (success) {
                    const batteryLevel = this.deviceStatus.status.battery.battery.value;
                    if (batteryLevel === null) {
                        return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                    }
                    if (batteryLevel > 40) {
                        this.log.debug(`${this.name} battery level normal`);
                    }
                    else {
                        this.log.debug(`${this.name} battery level LOW`);
                    }
                    resolve(batteryLevel <= 30 ?
                        this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW :
                        this.platform.Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL);
                }
                else {
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
}
exports.BatteryService = BatteryService;
//# sourceMappingURL=batteryService.js.map