"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FanSwitchLevelService = void 0;
const baseService_1 = require("./baseService");
class FanSwitchLevelService extends baseService_1.BaseService {
    setLevelDebounceTimer;
    lastSentLevel;
    constructor(platform, accessory, componentId, capabilitites, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilitites, multiServiceAccessory, name, deviceStatus);
        this.setServiceType(platform.Service.Fan);
        // Set the event handlers
        this.log.debug(`Adding FanSwitchLevelService to ${this.name}`);
        this.service.getCharacteristic(platform.Characteristic.On)
            .onGet(this.getSwitchState.bind(this))
            .onSet(this.setSwitchState.bind(this));
        this.service.getCharacteristic(platform.Characteristic.RotationSpeed)
            .onSet(this.setLevel.bind(this))
            .onGet(this.getLevel.bind(this));
        let pollSwitchesAndLightsSeconds = 10; // default to 10 seconds
        if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
            pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
        }
        if (pollSwitchesAndLightsSeconds > 0) {
            multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getSwitchState.bind(this), this.service, platform.Characteristic.On);
            multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getLevel.bind(this), this.service, platform.Characteristic.RotationSpeed);
        }
    }
    // Set the target
    async setSwitchState(value) {
        this.log.debug('Received setSwitchState(' + value + ') event for ' + this.name);
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(this.name + ' is offline');
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        const turnOn = Boolean(value);
        if (!turnOn) {
            if (this.setLevelDebounceTimer) {
                clearTimeout(this.setLevelDebounceTimer);
            }
            this.lastSentLevel = 0;
            const success = await this.multiServiceAccessory.sendCommand('switch', 'off');
            if (success) {
                this.log.debug('onSet(off) SUCCESSFUL for ' + this.name);
                this.multiServiceAccessory.forceNextStatusRefresh();
            }
            else {
                this.log.error(`Command failed for ${this.name}`);
            }
            return;
        }
        if (this.lastSentLevel && this.lastSentLevel > 0) {
            return;
        }
        const success = await this.multiServiceAccessory.sendCommand('switch', 'on');
        if (success) {
            this.log.debug('onSet(on) SUCCESSFUL for ' + this.name);
            this.multiServiceAccessory.forceNextStatusRefresh();
        }
        else {
            this.log.error(`Command failed for ${this.name}`);
        }
    }
    // Get the current state of the lock
    async getSwitchState() {
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
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(this.accessory.context.device.label + ' is offline');
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        const targetLevel = Number(value);
        if (this.setLevelDebounceTimer) {
            clearTimeout(this.setLevelDebounceTimer);
        }
        return new Promise((resolve, reject) => {
            this.setLevelDebounceTimer = setTimeout(async () => {
                if (this.lastSentLevel === targetLevel) {
                    this.log.debug(`Level for ${this.name} already at ${targetLevel}, skipping duplicate command`);
                    resolve();
                    return;
                }
                this.log.debug(`Setting switchLevel of ${this.name} to ${targetLevel}`);
                this.lastSentLevel = targetLevel;
                const success = await this.multiServiceAccessory.sendCommand('switchLevel', 'setLevel', [targetLevel]);
                if (success) {
                    this.log.debug('setLevel(' + value + ') SUCCESSFUL for ' + this.name);
                    this.multiServiceAccessory.forceNextStatusRefresh();
                    resolve();
                }
                else {
                    this.log.error(`Failed to send setLevel command for ${this.name}`);
                    reject(new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */));
                }
            }, 350);
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
                if (this.deviceStatus?.status?.switchLevel?.level?.value !== undefined &&
                    this.deviceStatus?.status?.switchLevel?.level?.value !== null) {
                    level = this.deviceStatus.status.switchLevel.level.value;
                    this.lastSentLevel = level;
                    this.log.debug('getLevel() SUCCESSFUL for ' + this.name + '. value = ' + level);
                    resolve(level);
                }
                else {
                    resolve(0);
                }
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
                this.lastSentLevel = Number(event.value);
                this.service.updateCharacteristic(this.platform.Characteristic.RotationSpeed, event.value);
            }
        }
    }
}
exports.FanSwitchLevelService = FanSwitchLevelService;
//# sourceMappingURL=fanSwitchLevelService.js.map