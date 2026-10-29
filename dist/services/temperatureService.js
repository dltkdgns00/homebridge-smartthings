"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemperatureService = void 0;
const sensorService_1 = require("./sensorService");
class TemperatureService extends sensorService_1.SensorService {
    unit = 'F';
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.log.debug(`Adding TemperatureService to ${this.name}`);
        this.initService(platform.Service.TemperatureSensor, platform.Characteristic.CurrentTemperature, (status) => {
            if (status.temperatureMeasurement.temperature.value === null || status.temperatureMeasurement.temperature.value === undefined ||
                status.temperatureMeasurement.temperature.unit === null || status.temperatureMeasurement.temperature.value === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            if (status.temperatureMeasurement.temperature.unit === 'F') {
                this.log.debug('Converting temp to celcius');
                return (status.temperatureMeasurement.temperature.value - 32) * (5 / 9); // Convert to Celcius
            }
            else {
                this.unit = 'C';
                return status.temperatureMeasurement.temperature.value;
            }
        });
    }
    processEvent(event) {
        this.log.debug(`Event updating temperature measurement for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.CurrentTemperature, this.unit === 'F' ? (event.value - 32) * (5 / 9) : event.value);
    }
}
exports.TemperatureService = TemperatureService;
//# sourceMappingURL=temperatureService.js.map