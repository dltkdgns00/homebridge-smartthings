"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactSensorService = void 0;
const sensorService_1 = require("./sensorService");
class ContactSensorService extends sensorService_1.SensorService {
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.log.debug(`Adding ContactService to ${this.name}`);
        this.initService(platform.Service.ContactSensor, platform.Characteristic.ContactSensorState, (status) => {
            if (status.contactSensor.contact.value === null || status.contactSensor.contact.value === undefined) {
                this.log.warn(`${this.name} returned bad value for status`);
                throw ('Bad Value');
            }
            return status.contactSensor.contact.value === 'closed' ?
                this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
                this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED;
        });
        this.setServiceType(platform.Service.ContactSensor);
    }
    processEvent(event) {
        this.log.debug(`Event updating contactSensor capability for ${this.name} to ${event.value}`);
        this.service.updateCharacteristic(this.platform.Characteristic.ContactSensorState, event.value === 'closed' ?
            this.platform.Characteristic.ContactSensorState.CONTACT_DETECTED :
            this.platform.Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
    }
}
exports.ContactSensorService = ContactSensorService;
//# sourceMappingURL=contactSensorService.js.map