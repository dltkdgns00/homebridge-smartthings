"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LightService = void 0;
const baseService_1 = require("./baseService");
class LightService extends baseService_1.BaseService {
    // There is a device that can't handle sethue and setsaturation separately and requires both
    // args using setcolor.
    currentColor = {
        hue: 0,
        saturation: 0,
    };
    requireSetColor = false;
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.setServiceType(platform.Service.Lightbulb);
        // Set the event handlers
        this.log.debug(`Adding LightService to ${this.name}`);
        this.service.getCharacteristic(platform.Characteristic.On)
            .onGet(this.getSwitchState.bind(this))
            .onSet(this.setSwitchState.bind(this));
        // if (accessory.context.device.components[0].capabilities.find(c => c.id === 'switchLevel')) {
        if (this.findCapability('switchLevel')) {
            this.log.debug(`${this.name} supports switchLevel`);
            this.service.getCharacteristic(platform.Characteristic.Brightness)
                .onSet(this.setLevel.bind(this))
                .onGet(this.getLevel.bind(this));
        }
        // If this bulb supports colorTemperature, then add those handlers
        // if (accessory.context.device.components[0].capabilities.find(c => c.id === 'colorTemperature')) {
        if (this.findCapability('colorTemperature')) {
            this.log.debug(`${this.name} supports colorTemperature`);
            this.service.getCharacteristic(platform.Characteristic.ColorTemperature)
                .onSet(this.setColorTemp.bind(this))
                .onGet(this.getColorTemp.bind(this));
        }
        // If we support color control...
        //if (accessory.context.device.components[0].capabilities.find(c => c.id === 'colorControl')) {
        if (this.findCapability('colorControl')) {
            this.log.debug(`${this.name} supports colorControl`);
            this.service.getCharacteristic(platform.Characteristic.Hue)
                .onSet(this.setHue.bind(this))
                .onGet(this.getHue.bind(this));
            this.service.getCharacteristic(platform.Characteristic.Saturation)
                .onSet(this.setSaturation.bind(this))
                .onGet(this.getSaturation.bind(this));
            // Get current color setting.  Sets currentColor values to start
            this.getHue();
            this.getSaturation();
        }
        let pollSwitchesAndLightsSeconds = 10; // default to 10 seconds
        if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
            pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
        }
        if (pollSwitchesAndLightsSeconds > 0) {
            multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getSwitchState.bind(this), this.service, platform.Characteristic.On);
        }
    }
    async setSwitchState(value) {
        this.log.debug('Received setSwitchState(' + value + ') event for ' + this.name);
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(this.name + ' is offline');
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        this.multiServiceAccessory.sendCommand('switch', value ? 'on' : 'off').then((success) => {
            if (success) {
                this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
                this.multiServiceAccessory.forceNextStatusRefresh();
                // this.deviceStatus.timestamp = 0;
            }
            else {
                this.log.error(`Command failed for ${this.name}`);
            }
        });
    }
    async getSwitchState() {
        // if you need to return an error to show the device as "Not Responding" in the Home app:
        // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
        this.log.debug('Received getSwitchState() event for ' + this.name);
        return new Promise((resolve, reject) => {
            this.getStatus().then(success => {
                if (success) {
                    const switchState = this.deviceStatus.status.switch.switch.value;
                    this.log.debug(`SwitchState value from ${this.name}: ${switchState}`);
                    resolve(switchState === 'on');
                }
                else {
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
    async setLevel(value) {
        this.log.debug('Received setLevel(' + value + ') event for ' + this.name);
        return new Promise((resolve, reject) => {
            if (!this.multiServiceAccessory.isOnline()) {
                this.log.error(this.accessory.context.device.label + ' is offline');
                return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
            }
            this.multiServiceAccessory.sendCommand('switchLevel', 'setLevel', [value]).then(success => {
                if (success) {
                    this.log.debug('setLevel(' + value + ') SUCCESSFUL for ' + this.name);
                    this.multiServiceAccessory.forceNextStatusRefresh();
                    // this.deviceStatus.timestamp = 0;
                    resolve();
                }
                else {
                    this.log.error(`Failed to send setLevel command for ${this.name}`);
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
    async getLevel() {
        this.log.debug('Received getLevel() event for ' + this.name);
        let level = 0;
        return new Promise((resolve, reject) => {
            if (!this.multiServiceAccessory.isOnline()) {
                this.log.error(this.accessory.context.device.label + ' is offline');
                return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
            }
            this.getStatus().then((success) => {
                if (!success) {
                    this.log.error(`Could not get device status for ${this.name}`);
                    return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
                try {
                    if (this.deviceStatus.status.switchLevel.level.value !== undefined) {
                        level = this.deviceStatus.status.switchLevel.level.value;
                        this.log.debug('getLevel() SUCCESSFUL for ' + this.name + '. value = ' + level);
                        resolve(level);
                    }
                    else {
                        this.log.error('getLevel() FAILED for ' + this.name + '. Undefined value');
                        reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                    }
                }
                catch (e) {
                    this.log.error('getLevel() FAILED for ' + this.name + '. Error: ' + e);
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
    async setColorTemp(value) {
        this.log.debug(`Set Color Temperature received with value ${value}`);
        return new Promise((resolve, reject) => {
            if (!this.multiServiceAccessory.isOnline()) {
                this.log.error(this.accessory.context.device.label + ' is offline');
                return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
            }
            const stValue = 6500 - Math.round((value - 140) / 360 * 6500) + 1;
            this.log.debug(`Sending converted temperature value of ${stValue} to ${this.name}`);
            this.multiServiceAccessory.sendCommand('colorTemperature', 'setColorTemperature', [stValue])
                .then(() => resolve())
                .catch((value) => reject(value));
        });
    }
    async getColorTemp() {
        return new Promise((resolve, reject) => {
            this.getStatus().then((success) => {
                if (!success) {
                    //this.online = false;
                    this.log.error(`Could not get device status for ${this.name}`);
                    return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
                let stTemperature;
                if (this.deviceStatus.status.colorTemperature.colorTemperature.value !== undefined) {
                    stTemperature = Math.min(this.deviceStatus.status.colorTemperature.colorTemperature.value, 6500);
                    this.log.debug('getColorTemperature() SUCCESSFUL for ' + this.name + '. value = ' + stTemperature);
                    // Convert number to the homebridge compatible value
                    const hbTemperature = 500 - ((stTemperature / 6500) * 360);
                    resolve(hbTemperature);
                }
                else {
                    this.log.error('getColorTemperature() FAILED for ' + this.name + '. Undefined value');
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
    //
    // If we get an error setting individual hue or saturation, then use setColor to set both at once.  Needed to fix #96
    //
    async setColor(hue, saturation) {
        this.log.debug(`setColor called with hue: ${hue}, saturation: ${saturation}}`);
        return new Promise((resolve) => {
            this.multiServiceAccessory.sendCommand('colorControl', 'setColor', [{
                    hue: this.currentColor.hue,
                    saturation: this.currentColor.saturation,
                }])
                .then((success) => resolve(success));
        });
    }
    async setHue(value) {
        this.log.debug(`setHue called with value ${value}`);
        const huePct = Math.round((value / 360) * 100);
        this.currentColor.hue = huePct;
        this.log.debug(`Hue arc value of ${value} converted to Hue Percent of ${huePct}`);
        return new Promise((resolve, reject) => {
            if (this.requireSetColor) { // Issue #96
                this.setColor(this.currentColor.hue, this.currentColor.saturation)
                    .then(() => resolve())
                    .catch((value) => reject(value));
            }
            else {
                this.multiServiceAccessory.sendCommand('colorControl', 'setHue', [huePct])
                    .then((success) => {
                    if (success) {
                        resolve();
                    }
                    else {
                        this.log.warn(`Received ${value} setting hue for ${this.name}, will try setting color`);
                        this.requireSetColor = true;
                        this.setColor(this.currentColor.hue, this.currentColor.saturation).then((success) => {
                            if (!success) {
                                reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                            }
                            else {
                                resolve();
                            }
                        });
                    }
                });
            }
        });
    }
    async getHue() {
        return new Promise((resolve, reject) => {
            this.getStatus().then((success) => {
                if (!success) {
                    //this.online = false;
                    this.log.error(`Could not get device status for ${this.name}`);
                    return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
                if (this.deviceStatus.status.colorControl.hue.value !== undefined) {
                    const hue = this.deviceStatus.status.colorControl.hue.value;
                    this.log.debug('getHue() SUCCESSFUL for ' + this.name + '. value = ' + hue);
                    this.currentColor.hue = hue;
                    const hueArc = Math.round((hue / 100) * 360);
                    this.log.debug(`Hue Percent of ${hue} converted to ${hueArc}.`);
                    resolve(hueArc);
                }
                else {
                    this.log.error('getHue() FAILED for ' + this.name + '. Undefined value');
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            });
        });
    }
    async setSaturation(value) {
        this.log.debug(`setSaturation called with value ${value}`);
        this.currentColor.saturation = value;
        return new Promise((resolve, reject) => {
            if (this.requireSetColor) {
                this.setColor(this.currentColor.hue, this.currentColor.saturation)
                    .then(() => resolve())
                    .catch((value) => reject(value));
            }
            else {
                this.multiServiceAccessory.sendCommand('colorControl', 'setSaturation', [value])
                    .then((success) => {
                    if (success) {
                        resolve();
                    }
                    else {
                        this.log.warn(`Received ${value} setting saturation for ${this.name}, will try setting color`);
                        this.requireSetColor = true;
                        this.setColor(this.currentColor.hue, this.currentColor.saturation).then(success => {
                            if (success) {
                                resolve();
                            }
                            else {
                                reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                            }
                        });
                    }
                });
            }
        });
    }
    async getSaturation() {
        return new Promise((resolve, reject) => {
            this.getStatus().then((success) => {
                if (!success) {
                    this.log.error(`Could not get device status for ${this.name}`);
                    return reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
                if (this.deviceStatus.status.colorControl.saturation.value !== undefined) {
                    const satPct = this.deviceStatus.status.colorControl.saturation.value;
                    this.currentColor.saturation = satPct;
                    this.log.debug('getSaturation() SUCCESSFUL for ' + this.name + '. value = ' + satPct);
                    // Convert saturation from percent to degrees
                    resolve(satPct);
                }
                else {
                    this.log.error('getSaturation() FAILED for ' + this.name + '. Undefined value');
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            }).catch(() => {
                this.log.error('getSaturation() FAILED for ' + this.name + '. Comm error.');
                reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
            });
        });
    }
    processEvent(event) {
        switch (event.capability) {
            case 'switch': {
                this.log.debug(`Event updating switch capability for ${this.name} to ${event.value}`);
                this.service.updateCharacteristic(this.platform.Characteristic.On, event.value === 'on');
                return;
            }
            case 'switchLevel': {
                this.log.debug(`Event updating switchLevel capability for ${this.name} to ${event.value}`);
                this.service.updateCharacteristic(this.platform.Characteristic.Brightness, event.value);
                return;
            }
            case 'colorTemperature': {
                this.log.debug(`Event updating colorTemperature capability for ${this.name} to ${event.value}`);
                const stTemperature = Math.min(this.deviceStatus.status.colorTemperature.colorTemperature.value, 6500);
                this.log.debug('getColorTemperature() SUCCESSFUL for ' + this.name + '. value = ' + stTemperature);
                // Convert number to the homebridge compatible value
                const hbTemperature = 500 - ((stTemperature / 6500) * 360);
                this.service.updateCharacteristic(this.platform.Characteristic.ColorTemperature, hbTemperature);
                return;
            }
            case 'colorControl': {
                this.log.debug(`Event for colorControl, attribute is ${event.attribute}, value is ${event.value}`);
                if (event.attribute === 'hue') {
                    const hueArc = Math.round((event.value / 100) * 360);
                    this.service.updateCharacteristic(this.platform.Characteristic.Hue, hueArc);
                }
                else if (event.attribute === 'saturation') {
                    this.service.updateCharacteristic(this.platform.Characteristic.Saturation, event.value);
                }
            }
        }
    }
}
exports.LightService = LightService;
//# sourceMappingURL=lightService.js.map