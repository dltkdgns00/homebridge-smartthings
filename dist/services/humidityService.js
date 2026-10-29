"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HumidityService = void 0;
const sensorService_1 = require("./sensorService");
class HumidityService extends sensorService_1.SensorService {
    constructor(platform, accessory, componentId, capabilitites, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilitites, multiServiceAccessory, name, deviceStatus);
        this.log.debug(`Adding HumidityService to ${this.name}`);
        this.initService(platform.Service.HumiditySensor, platform.Characteristic.CurrentRelativeHumidity, (status) => {
            if (status.relativeHumidityMeasurement.humidity.value === null || status.relativeHumidityMeasurement.humidity.value === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            return status.relativeHumidityMeasurement.humidity.value;
        });
    }
    processEvent(event) {
        this.log.debug(`Event updating humidity sensor for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, event.value);
    }
}
exports.HumidityService = HumidityService;
//# sourceMappingURL=humidityService.js.map