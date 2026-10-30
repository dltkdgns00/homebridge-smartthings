"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SensorService = void 0;
const baseService_1 = require("./baseService");
class SensorService extends baseService_1.BaseService {
    statusFailureCount = 0;
    statusTranslation = () => {
        return null;
    };
    pollingTimer;
    characteristic;
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
    }
    initService(sensorService, sensorCharacteristic, statusTranslation) {
        this.statusTranslation = statusTranslation;
        this.setServiceType(sensorService);
        this.characteristic = sensorCharacteristic;
        // Set the event handlers
        this.service.getCharacteristic(sensorCharacteristic)
            .onGet(this.getSensorState.bind(this));
        let pollSensorsSeconds = 10; // default to 10 seconds
        if (this.platform.config.PollSensorsSeconds !== undefined) {
            pollSensorsSeconds = this.platform.config.PollSensorsSeconds;
        }
        if (pollSensorsSeconds > 0) {
            this.pollingTimer = this.multiServiceAccessory.startPollingState(pollSensorsSeconds, this.getSensorState.bind(this), this.service, sensorCharacteristic);
        }
    }
    // Get the current state of the sensor
    async getSensorState() {
        // if you need to return an error to show the device as "Not Responding" in the Home app:
        // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        this.log.debug('Received getSensorState() event for ' + this.name);
        return new Promise((resolve, reject) => {
            this.getStatus().then(success => {
                if (success) {
                    let value;
                    try {
                        value = this.statusTranslation(this.deviceStatus.status);
                        this.statusFailureCount = 0;
                        this.log.debug(`State for ${this.name}: ${value}`);
                        resolve(value);
                        return;
                    }
                    catch (error) {
                        this.statusFailureCount++;
                        if (this.statusFailureCount > 5) {
                            if (this.pollingTimer) {
                                this.log.warn(`Bad status from ${this.name} exceeded limit. Removing this sensor service.`);
                                clearInterval(this.pollingTimer);
                                this.pollingTimer = undefined;
                                try {
                                    this.accessory.removeService(this.service);
                                }
                                catch {
                                    // already removed
                                }
                            }
                        }
                        else {
                            this.log.debug(`Bad status from ${this.name}. Ignoring for now (${this.statusFailureCount}/5).`);
                        }
                        reject(new this.platform.api.hap.HapStatusError(-70410 /* this.platform.api.hap.HAPStatus.INVALID_VALUE_IN_REQUEST */));
                        return;
                    }
                }
                else {
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
}
exports.SensorService = SensorService;
//# sourceMappingURL=sensorService.js.map