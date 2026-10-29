"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupancySensorService = void 0;
const sensorService_1 = require("./sensorService");
class OccupancySensorService extends sensorService_1.SensorService {
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.log.debug(`Adding OccupancySensorService to ${this.name}`);
        this.initService(platform.Service.OccupancySensor, platform.Characteristic.OccupancyDetected, (status) => {
            if (status.presenceSensor.presence.value === null || status.presenceSensor.presence.value === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            return status.presenceSensor.presence.value === 'present' ? 1 : 0;
        });
    }
    processEvent(event) {
        this.log.debug(`Event updating occupancy (presence) for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.OccupancyDetected, event.value === 'present' ? 1 : 0);
    }
}
exports.OccupancySensorService = OccupancySensorService;
//# sourceMappingURL=occupancySensorService.js.map