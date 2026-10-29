"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RobotVacuumService = void 0;
const baseService_1 = require("./baseService");
const smartThingsCommand_1 = require("./smartThingsCommand");
class RobotVacuumService extends baseService_1.BaseService {
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.setServiceType(platform.Service.Switch);
        this.log.debug(`Adding RobotVacuumService to ${this.name}`);
        this.service.getCharacteristic(platform.Characteristic.On)
            .onGet(this.getVacuumState.bind(this))
            .onSet(this.setVacuumState.bind(this));
        let pollSeconds = 15;
        if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
            pollSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
        }
        if (pollSeconds > 0) {
            multiServiceAccessory.startPollingState(pollSeconds, this.getVacuumState.bind(this), this.service, platform.Characteristic.On);
        }
    }
    hasCapability(cap) {
        return this.capabilities.includes(cap);
    }
    async setVacuumState(value) {
        this.log.debug(`Received setVacuumState(${value}) for ${this.name}`);
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(`${this.name} is offline`);
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        const turnOn = Boolean(value);
        const commands = [];
        if (turnOn) {
            if (this.hasCapability('samsungce.robotCleanerOperatingState')) {
                commands.push(new smartThingsCommand_1.Command('samsungce.robotCleanerOperatingState', 'start'));
            }
            else if (this.hasCapability('robotCleanerCleaningMode')) {
                commands.push(new smartThingsCommand_1.Command('robotCleanerCleaningMode', 'setRobotCleanerCleaningMode', ['auto']));
            }
            else if (this.hasCapability('robotCleanerMovement')) {
                commands.push(new smartThingsCommand_1.Command('robotCleanerMovement', 'setRobotCleanerMovement', ['cleaning']));
            }
            else if (this.hasCapability('switch')) {
                commands.push(new smartThingsCommand_1.Command('switch', 'on'));
            }
        }
        else {
            if (this.hasCapability('samsungce.robotCleanerOperatingState')) {
                commands.push(new smartThingsCommand_1.Command('samsungce.robotCleanerOperatingState', 'returnToHome'));
            }
            else if (this.hasCapability('robotCleanerMovement')) {
                commands.push(new smartThingsCommand_1.Command('robotCleanerMovement', 'setRobotCleanerMovement', ['homing']));
            }
            else if (this.hasCapability('robotCleanerCleaningMode')) {
                commands.push(new smartThingsCommand_1.Command('robotCleanerCleaningMode', 'setRobotCleanerCleaningMode', ['stop']));
            }
            else if (this.hasCapability('switch')) {
                commands.push(new smartThingsCommand_1.Command('switch', 'off'));
            }
        }
        if (commands.length === 0) {
            this.log.warn(`No supported command capability found for robot vacuum ${this.name}`);
            return;
        }
        const success = await this.multiServiceAccessory.sendCommands(commands);
        if (success) {
            this.log.debug(`setVacuumState(${value}) SUCCESSFUL for ${this.name}`);
            this.multiServiceAccessory.forceNextStatusRefresh();
        }
        else {
            this.log.error(`Command failed for ${this.name}`);
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
    }
    async getVacuumState() {
        this.log.debug(`Received getVacuumState() for ${this.name}`);
        const success = await this.getStatus();
        if (!success) {
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        const status = this.deviceStatus?.status;
        if (!status) {
            return false;
        }
        if (this.hasCapability('samsungce.robotCleanerOperatingState')) {
            const opState = status['samsungce.robotCleanerOperatingState']?.operatingState?.value;
            if (opState !== undefined && opState !== null) {
                return ['cleaning', 'starting', 'moving', 'paused'].includes(String(opState).toLowerCase());
            }
        }
        if (this.hasCapability('robotCleanerMovement')) {
            const movement = status.robotCleanerMovement?.robotCleanerMovement?.value;
            if (movement !== undefined && movement !== null) {
                return ['cleaning', 'point', 'after'].includes(String(movement).toLowerCase());
            }
        }
        if (this.hasCapability('robotCleanerCleaningMode')) {
            const mode = status.robotCleanerCleaningMode?.robotCleanerCleaningMode?.value;
            if (mode !== undefined && mode !== null) {
                return ['auto', 'part', 'repeat', 'manual'].includes(String(mode).toLowerCase());
            }
        }
        if (this.hasCapability('switch')) {
            const switchVal = status.switch?.switch?.value;
            return switchVal === 'on';
        }
        return false;
    }
    processEvent(event) {
        this.log.debug(`Event updating robot vacuum ${this.name}: ${event.capability}.${event.attribute} = ${event.value}`);
        const val = String(event.value).toLowerCase();
        let isCleaning = false;
        if (event.capability === 'samsungce.robotCleanerOperatingState') {
            isCleaning = ['cleaning', 'starting', 'moving', 'paused'].includes(val);
        }
        else if (event.capability === 'robotCleanerMovement') {
            isCleaning = ['cleaning', 'point', 'after'].includes(val);
        }
        else if (event.capability === 'robotCleanerCleaningMode') {
            isCleaning = ['auto', 'part', 'repeat', 'manual'].includes(val);
        }
        else if (event.capability === 'switch') {
            isCleaning = val === 'on';
        }
        else {
            return;
        }
        this.service.updateCharacteristic(this.platform.Characteristic.On, isCleaning);
    }
}
exports.RobotVacuumService = RobotVacuumService;
//# sourceMappingURL=robotVacuumService.js.map