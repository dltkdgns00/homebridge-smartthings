"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarbonMonoxideDetectorService = void 0;
const sensorService_1 = require("./sensorService");
class CarbonMonoxideDetectorService extends sensorService_1.SensorService {
    serviceName = 'CarbonMonixideDetector';
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.initService(platform.Service.CarbonMonoxideSensor, platform.Characteristic.CarbonMonoxideDetected, (status) => {
            const deviceStatus = status.carbonMonoxideDetector.carbonMonoxide.value;
            if (deviceStatus === null || deviceStatus === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            return deviceStatus === 'detected' ?
                this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
                this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL;
        });
        this.log.debug(`Adding ${this.serviceName} Service to ${this.name}`);
    }
    processEvent(event) {
        this.log.debug(`Event updating CO detection for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.CarbonDioxideDetected, (event.value === 'detected' ? this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_ABNORMAL :
            this.platform.Characteristic.CarbonMonoxideDetected.CO_LEVELS_NORMAL));
    }
}
exports.CarbonMonoxideDetectorService = CarbonMonoxideDetectorService;
//# sourceMappingURL=carbonMonoxideDetector.js.map