"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightSensorService = void 0;
const sensorService_1 = require("./sensorService");
class LightSensorService extends sensorService_1.SensorService {
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.log.debug(`Adding LightSensorService to ${this.name}`);
        this.initService(platform.Service.LightSensor, platform.Characteristic.CurrentAmbientLightLevel, (status) => {
            if (status.illuminanceMeasurement.illuminance.value === null || status.illuminanceMeasurement.illuminance.value === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            // Fix when value comes back as Zero
            return status.illuminanceMeasurement.illuminance.value <= 0 ? .0001 : status.illuminanceMeasurement.illuminance.value;
        });
    }
    processEvent(event) {
        this.log.debug(`Event updating light sensor for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentAmbientLightLevel, Math.max(event.value, .0001)); // Home Kit doesn't accept a value less than .0001
    }
}
exports.LightSensorService = LightSensorService;
//# sourceMappingURL=lightSensorService.js.map