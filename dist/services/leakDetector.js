"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeakDetectorService = void 0;
const sensorService_1 = require("./sensorService");
class LeakDetectorService extends sensorService_1.SensorService {
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.initService(platform.Service.LeakSensor, platform.Characteristic.LeakDetected, (status) => {
            if (status.waterSensor.water.value === null || status.waterSensor.water.value === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            return status.waterSensor.water.value === 'wet' ?
                this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
                this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED;
        });
        this.log.debug(`Adding LeakDetector Service to ${this.name}`);
    }
    processEvent(event) {
        this.log.debug(`Event updating leak detector for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.LeakDetected, event.value === 'wet' ?
            this.platform.Characteristic.LeakDetected.LEAK_DETECTED :
            this.platform.Characteristic.LeakDetected.LEAK_NOT_DETECTED);
    }
}
exports.LeakDetectorService = LeakDetectorService;
//# sourceMappingURL=leakDetector.js.map