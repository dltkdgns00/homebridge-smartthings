"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThermostatService = void 0;
const baseService_1 = require("./baseService");
class ThermostatService extends baseService_1.BaseService {
    targetHeatingCoolingState;
    targetTemperature = 20;
    units = 'C';
    supportsOperatingState = false;
    supportsCooling = false;
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        const existingSwitch = this.accessory.getService(platform.Service.Switch);
        if (existingSwitch) {
            this.accessory.removeService(existingSwitch);
        }
        this.setServiceType(platform.Service.Thermostat);
        this.log.debug(`Adding ThermostatService to ${this.name} with capabilities: ${capabilities.join(', ')}`);
        const component = this.multiServiceAccessory.components.find((c) => c.componentId === componentId);
        if (component && component.capabilities.find((cap) => cap === 'thermostatOperatingState')) {
            this.supportsOperatingState = true;
        }
        this.supportsCooling = this.capabilities.includes('thermostatCoolingSetpoint');
        const TargetState = platform.Characteristic.TargetHeatingCoolingState;
        const CurrentState = platform.Characteristic.CurrentHeatingCoolingState;
        this.service.getCharacteristic(CurrentState)
            .onGet(this.getCurrentHeatingCoolingState.bind(this));
        const targetStateChar = this.service.getCharacteristic(TargetState)
            .onGet(this.getTargetHeatingCoolingState.bind(this))
            .onSet(this.setTargetHeatingCoolingState.bind(this));
        if (!this.supportsCooling) {
            targetStateChar.setProps({
                validValues: [
                    TargetState.OFF,
                    TargetState.HEAT,
                ],
            });
        }
        this.service.getCharacteristic(platform.Characteristic.CurrentTemperature)
            .setProps({ minValue: -20, maxValue: 100 })
            .onGet(this.getCurrentTemperature.bind(this));
        this.service.getCharacteristic(platform.Characteristic.TargetTemperature)
            .setProps({ minValue: 5, maxValue: 40, minStep: 0.5 })
            .onGet(this.getTargetTemperature.bind(this))
            .onSet(this.setTargetTemperature.bind(this));
        this.service.getCharacteristic(platform.Characteristic.TemperatureDisplayUnits)
            .onGet(this.getTemperatureDisplayUnits.bind(this))
            .onSet(this.setTemperatureDisplayUnits.bind(this));
        this.targetHeatingCoolingState = TargetState.OFF;
        this.targetTemperature = 20;
        let pollSensors = 10;
        if (this.platform.config.PollSensorsSeconds !== undefined) {
            pollSensors = this.platform.config.PollSensorsSeconds;
        }
        if (pollSensors > 0) {
            multiServiceAccessory.startPollingState(pollSensors, this.getCurrentHeatingCoolingState.bind(this), this.service, CurrentState, TargetState, this.getTargetHeatingCoolingState.bind(this));
            multiServiceAccessory.startPollingState(pollSensors, this.getCurrentTemperature.bind(this), this.service, platform.Characteristic.CurrentTemperature, platform.Characteristic.TargetTemperature, this.getTargetTemperature.bind(this));
        }
    }
    hasCapability(cap) {
        return this.capabilities.includes(cap);
    }
    // TARGET STATE CALLBACKS
    async getTargetHeatingCoolingState() {
        this.log.debug('Received getTargetHeatingCoolingState for ' + this.name);
        const TargetState = this.platform.Characteristic.TargetHeatingCoolingState;
        const success = await this.getStatus();
        if (!success) {
            return this.targetHeatingCoolingState;
        }
        const status = this.deviceStatus?.status;
        if (!status) {
            return this.targetHeatingCoolingState;
        }
        if (this.hasCapability('thermostatMode')) {
            const state = status.thermostatMode?.thermostatMode?.value;
            if (state === null || state === undefined) {
                return this.targetHeatingCoolingState;
            }
            switch (String(state).toLowerCase()) {
                case 'cool':
                    this.targetHeatingCoolingState = this.supportsCooling ? TargetState.COOL : TargetState.HEAT;
                    break;
                case 'heat':
                case 'emergency heat':
                case 'on':
                case 'eco':
                    this.targetHeatingCoolingState = TargetState.HEAT;
                    break;
                case 'auto':
                    this.targetHeatingCoolingState = this.supportsCooling ? TargetState.AUTO : TargetState.HEAT;
                    break;
                default:
                    this.targetHeatingCoolingState = TargetState.OFF;
                    break;
            }
            return this.targetHeatingCoolingState;
        }
        if (this.hasCapability('switch')) {
            const sw = status.switch?.switch?.value;
            this.targetHeatingCoolingState = sw === 'on' ? TargetState.HEAT : TargetState.OFF;
            return this.targetHeatingCoolingState;
        }
        this.targetHeatingCoolingState = this.supportsCooling ? TargetState.AUTO : TargetState.HEAT;
        return this.targetHeatingCoolingState;
    }
    // Set the target state of the thermostat
    async setTargetHeatingCoolingState(value) {
        this.log.debug('Received setTargetHeatingCoolingState(' + value + ') event for ' + this.name);
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(this.name + ' is offline');
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        this.targetHeatingCoolingState = value;
        const TargetState = this.platform.Characteristic.TargetHeatingCoolingState;
        if (this.hasCapability('thermostatMode')) {
            let cmd = 'off';
            switch (value) {
                case TargetState.AUTO:
                    cmd = this.supportsCooling ? 'auto' : 'heat';
                    break;
                case TargetState.COOL:
                    cmd = 'cool';
                    break;
                case TargetState.HEAT:
                    cmd = 'heat';
                    break;
                default:
                    cmd = 'off';
                    break;
            }
            const success = await this.multiServiceAccessory.sendCommand('thermostatMode', cmd);
            if (success) {
                this.log.debug('setTargetHeatingCoolingState(' + value + ') SUCCESSFUL for ' + this.name);
                this.multiServiceAccessory.forceNextStatusRefresh();
            }
            else {
                this.log.error(`Command failed for ${this.name}`);
            }
            return;
        }
        if (this.hasCapability('switch')) {
            const cmd = value === TargetState.OFF ? 'off' : 'on';
            const success = await this.multiServiceAccessory.sendCommand('switch', cmd);
            if (success) {
                this.multiServiceAccessory.forceNextStatusRefresh();
            }
            return;
        }
        this.log.debug(`Thermostat ${this.name} does not support thermostatMode or switch. Ignoring request`);
    }
    // CURRENT STATE
    async getCurrentHeatingCoolingState() {
        this.log.debug('Received getCurrentHeatingCoolingState() event for ' + this.name);
        const CurrentState = this.platform.Characteristic.CurrentHeatingCoolingState;
        const success = await this.getStatus();
        if (!success) {
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        const status = this.deviceStatus?.status;
        if (!status) {
            return CurrentState.OFF;
        }
        if (this.hasCapability('thermostatMode')) {
            const thermostatMode = status.thermostatMode?.thermostatMode?.value;
            if (thermostatMode === null || thermostatMode === undefined) {
                return CurrentState.OFF;
            }
            switch (String(thermostatMode).toLowerCase()) {
                case 'cool':
                    return CurrentState.COOL;
                case 'heat':
                case 'emergency heat':
                case 'auto':
                case 'on':
                case 'eco':
                    return CurrentState.HEAT;
                default:
                    return CurrentState.OFF;
            }
        }
        if (this.hasCapability('switch')) {
            const sw = status.switch?.switch?.value;
            return sw === 'on' ? CurrentState.HEAT : CurrentState.OFF;
        }
        if (this.supportsOperatingState) {
            const opState = status.thermostatOperatingState?.thermostatOperatingState?.value;
            if (opState === 'heating') {
                return CurrentState.HEAT;
            }
            else if (opState === 'cooling') {
                return CurrentState.COOL;
            }
        }
        return CurrentState.OFF;
    }
    // CURRENT TEMP
    async getCurrentTemperature() {
        this.log.debug('Received getCurrentTemperature for ' + this.name);
        const success = await this.getStatus();
        if (!success) {
            this.log.debug(`Failed to get status for ${this.name}`);
            return this.targetTemperature || 20;
        }
        const tempObj = this.deviceStatus?.status?.temperatureMeasurement?.temperature;
        if (!tempObj || tempObj.value === null || tempObj.value === undefined) {
            this.log.debug(`${this.name} returned empty value for temperature`);
            return this.targetTemperature || 20;
        }
        const num = Number(tempObj.value);
        if (isNaN(num)) {
            return this.targetTemperature || 20;
        }
        if (tempObj.unit === 'F') {
            this.units = 'F';
            return (num - 32) * (5 / 9);
        }
        this.units = 'C';
        return num;
    }
    // TARGET TEMP
    async getTargetTemperature() {
        this.log.debug('Received GetTargetTemperature for ' + this.name);
        const success = await this.getStatus();
        if (!success || !this.deviceStatus?.status) {
            return this.targetTemperature;
        }
        const TargetState = this.platform.Characteristic.TargetHeatingCoolingState;
        const targetMode = await this.getTargetHeatingCoolingState();
        let temp;
        if (this.supportsCooling && targetMode === TargetState.COOL) {
            temp = this.deviceStatus.status.thermostatCoolingSetpoint?.coolingSetpoint?.value;
        }
        else {
            temp = this.deviceStatus.status.thermostatHeatingSetpoint?.heatingSetpoint?.value;
        }
        if (temp === null || temp === undefined || isNaN(Number(temp))) {
            return this.targetTemperature;
        }
        let converted = Number(temp);
        if (this.units === 'F') {
            converted = (converted - 32) * (5 / 9);
        }
        converted = Math.min(Math.max(converted, 5), 40);
        this.targetTemperature = converted;
        return converted;
    }
    async setTargetTemperature(value) {
        this.log.debug('Received setTargetTemperature(' + value + ') event for ' + this.name);
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(this.name + ' is offline');
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        this.targetTemperature = value;
        let capability = 'thermostatHeatingSetpoint';
        let command = 'setHeatingSetpoint';
        if (this.supportsCooling && this.targetHeatingCoolingState === this.platform.Characteristic.TargetHeatingCoolingState.COOL) {
            capability = 'thermostatCoolingSetpoint';
            command = 'setCoolingSetpoint';
        }
        const convertedTemp = this.units === 'F' ? (value * (9 / 5)) + 32 : value;
        await this.multiServiceAccessory.sendCommand(capability, command, [convertedTemp]);
    }
    // DISPLAY UNITS
    getTemperatureDisplayUnits() {
        this.log.debug('Received getTemperatureDislayUnits for ' + this.name);
        if (this.units === 'C') {
            return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
        }
        else {
            return this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
        }
    }
    setTemperatureDisplayUnits(value) {
        this.log.debug(`Received request to set display units to ${value}. No equivalent in Smartthings...`);
        return;
    }
    processEvent(event) {
        this.log.debug(`Updating ${event.attribute} for ${this.name} from event to ${event.value}`);
        let characteristic = this.platform.Characteristic.TargetTemperature;
        let value;
        if (event.attribute === 'heatingSetpoint' || event.attribute === 'coolingSetpoint') {
            const raw = this.units === 'F' ? (event.value - 32) * (5 / 9) : Number(event.value);
            value = Math.min(Math.max(raw, 5), 40);
        }
        else {
            characteristic = this.platform.Characteristic.TargetHeatingCoolingState;
            switch (String(event.value).toLowerCase()) {
                case 'cool':
                    value = this.supportsCooling
                        ? this.platform.Characteristic.TargetHeatingCoolingState.COOL
                        : this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                case 'heat':
                case 'on':
                case 'eco':
                    value = this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                case 'auto':
                    value = this.supportsCooling
                        ? this.platform.Characteristic.TargetHeatingCoolingState.AUTO
                        : this.platform.Characteristic.TargetHeatingCoolingState.HEAT;
                    break;
                default:
                    value = this.platform.Characteristic.TargetHeatingCoolingState.OFF;
            }
        }
        this.service.updateCharacteristic(characteristic, value);
    }
}
exports.ThermostatService = ThermostatService;
//# sourceMappingURL=thermostatService.js.map