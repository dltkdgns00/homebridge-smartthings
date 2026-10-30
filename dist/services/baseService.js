"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const keyValues_1 = require("../keyValues");
class BaseService {
    accessory;
    log;
    platform;
    name = '';
    deviceStatus;
    multiServiceAccessory;
    service;
    componentId;
    capabilities;
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        this.capabilities = capabilities;
        this.accessory = accessory;
        // this.service = this.accessory.getService(platform.Service.MotionSensor) || this.accessory.addService(platform.Service.MotionSensor);
        this.platform = platform;
        this.log = platform.log;
        this.multiServiceAccessory = multiServiceAccessory;
        this.name = name;
        this.deviceStatus = deviceStatus;
        this.service = new platform.Service.Switch; // Placeholder
        this.componentId = componentId;
    }
    findCapability(capabilityToFind) {
        let component = this.accessory.context.device.components.find(c => c.id === this.componentId);
        if (component === undefined) {
            component = this.accessory.context.device.components.find(c => c.id === 'main');
        }
        if (component === undefined) {
            component = this.accessory.context.device.components[0];
        }
        return Boolean(component?.capabilities?.find(c => c.id === capabilityToFind));
    }
    setServiceType(serviceType) {
        if (this.componentId === 'main') {
            this.service = this.accessory.getService(serviceType) ||
                this.accessory.addService(serviceType);
        }
        else {
            this.log.debug(`Adding service to alternate component: ${this.componentId}`);
            this.service = this.accessory.getService(`${serviceType.name}-${this.componentId}`) ||
                this.accessory.addService(serviceType, `${serviceType.name}-${this.componentId}`, `${serviceType.name}-${this.componentId}`);
        }
        this.service.setCharacteristic(this.platform.Characteristic.Name, (0, keyValues_1.sanitizeName)(this.accessory.context.device.label));
    }
    async getStatus() {
        return new Promise((resolve) => {
            if (!this.multiServiceAccessory.isOnline()) {
                this.log.debug(`${this.name} is offline`);
                resolve(false);
                return;
            }
            this.multiServiceAccessory.refreshStatus()
                .then(success => {
                resolve(Boolean(success));
            });
        });
    }
    processEvent(event) {
        this.log.debug(`${this.name} Received event with value ${event.value} - not implemented yet`);
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=baseService.js.map