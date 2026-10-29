"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirConditionerService = void 0;
const smartThingsCommand_1 = require("./smartThingsCommand");
const baseService_1 = require("./baseService");
var AirConditionerMode;
(function (AirConditionerMode) {
    AirConditionerMode["Auto"] = "auto";
    AirConditionerMode["Cool"] = "cool";
    AirConditionerMode["Dry"] = "dry";
    AirConditionerMode["Heat"] = "heat";
    AirConditionerMode["Wind"] = "wind";
})(AirConditionerMode || (AirConditionerMode = {}));
var TemperatureUnit;
(function (TemperatureUnit) {
    TemperatureUnit["Celsius"] = "C";
    TemperatureUnit["Farenheit"] = "F";
})(TemperatureUnit || (TemperatureUnit = {}));
var FanMode;
(function (FanMode) {
    FanMode["Auto"] = "auto";
    FanMode["Low"] = "low";
    FanMode["Medium"] = "medium";
    FanMode["High"] = "high";
    FanMode["Turbo"] = "turbo";
})(FanMode || (FanMode = {}));
var FanOscillationMode;
(function (FanOscillationMode) {
    FanOscillationMode["All"] = "all";
    FanOscillationMode["Fixed"] = "fixed";
    FanOscillationMode["Vertical"] = "vertical";
})(FanOscillationMode || (FanOscillationMode = {}));
var SwitchState;
(function (SwitchState) {
    SwitchState["On"] = "on";
    SwitchState["Off"] = "off";
})(SwitchState || (SwitchState = {}));
var OptionalMode;
(function (OptionalMode) {
    OptionalMode["Off"] = "off";
    OptionalMode["Sleep"] = "sleep";
    OptionalMode["Speed"] = "speed";
    OptionalMode["WindFree"] = "windFree";
    OptionalMode["WindFreeSleep"] = "windFreeSleep";
})(OptionalMode || (OptionalMode = {}));
class AirConditionerService extends baseService_1.BaseService {
    temperatureUnit = TemperatureUnit.Celsius;
    thermostatService;
    fanService;
    humidityService;
    optionalModeSwitchService;
    optionalMode;
    lightService;
    constructor(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus) {
        super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
        this.log.debug(`Adding AirConditionerService to ${this.name}`);
        // Since Homekit does not natively support air conditioners, we need to expose
        // a thermostat and a fan to cover temperature settings, fan speed, and swing.
        this.thermostatService = this.setupThermostat(platform, multiServiceAccessory);
        this.fanService = this.setupFan(platform, multiServiceAccessory);
        // Exposing this sensor is optional since some Samsung air conditioner always report 0 as relative humidity level
        // or the device might not support it
        if (this.isCapabilitySupported('relativeHumidityMeasurement') && this.platform.config.ExposeHumiditySensorForAirConditioners) {
            this.humidityService = this.setupHumiditySensor(platform, multiServiceAccessory);
        }
        // Check if the device supports controlling the light
        if (this.isCapabilitySupported('switchLevel')) {
            this.lightService = this.setupLightSwitch(platform, multiServiceAccessory);
        }
        // Optional mode switch is exposed only if the related capability is suppoorted
        if (this.isCapabilitySupported('custom.airConditionerOptionalMode')) {
            this.optionalMode = OptionalMode[this.platform.config.OptionalModeForAirConditioners];
            // Expose a switch for the optional mode.
            // If the selected optional mode is undefined or not supported, changes to the switch will have no effect.
            this.optionalModeSwitchService = this.setupOptionalModeSwitch(platform, multiServiceAccessory);
        }
    }
    isCapabilitySupported(capability) {
        return this.capabilities.find(c => c === capability) !== undefined;
    }
    getPollSeconds() {
        return this.platform.config.PollSensorsSeconds !== undefined ? this.platform.config.PollSensorsSeconds : 10;
    }
    setupThermostat(platform, multiServiceAccessory) {
        this.log.debug(`Expose Thermostat for ${this.name}`);
        // add thermostat service
        this.setServiceType(platform.Service.Thermostat);
        const thermostatService = this.service;
        thermostatService.getCharacteristic(platform.Characteristic.CurrentHeatingCoolingState)
            .onGet(this.getCurrentHeatingCoolingState.bind(this));
        thermostatService.getCharacteristic(platform.Characteristic.TargetHeatingCoolingState)
            .onGet(this.getTargetHeatingCoolingState.bind(this))
            .onSet(this.setTargetHeatingCoolingState.bind(this));
        thermostatService.getCharacteristic(platform.Characteristic.CurrentTemperature)
            .onGet(this.getCurrentTemperature.bind(this));
        thermostatService.getCharacteristic(platform.Characteristic.TargetTemperature)
            .onGet(this.getTargetTemperature.bind(this))
            .onSet(this.setTargetTemperature.bind(this));
        thermostatService.getCharacteristic(platform.Characteristic.TemperatureDisplayUnits)
            .onGet(this.getTemperatureDisplayUnits.bind(this));
        const pollSeconds = this.getPollSeconds();
        multiServiceAccessory.startPollingState(pollSeconds, this.getCurrentHeatingCoolingState.bind(this), thermostatService, platform.Characteristic.CurrentHeatingCoolingState, platform.Characteristic.TargetHeatingCoolingState, this.getTargetHeatingCoolingState.bind(this));
        multiServiceAccessory.startPollingState(pollSeconds, this.getCurrentTemperature.bind(this), thermostatService, platform.Characteristic.CurrentTemperature, platform.Characteristic.TargetTemperature, this.getTargetTemperature.bind(this));
        return thermostatService;
    }
    setupFan(platform, multiServiceAccessory) {
        this.log.debug(`Expose Fan for ${this.name}`);
        this.setServiceType(platform.Service.Fanv2);
        const fanService = this.service;
        fanService.getCharacteristic(platform.Characteristic.Active)
            .onGet(this.getSwitchState.bind(this))
            .onSet(this.setSwitchState.bind(this));
        if (this.isCapabilitySupported('fanOscillationMode')) {
            fanService.getCharacteristic(platform.Characteristic.SwingMode)
                .onGet(this.getSwingMode.bind(this))
                .onSet(this.setSwingMode.bind(this));
        }
        fanService.getCharacteristic(platform.Characteristic.RotationSpeed)
            .onSet(this.setFanLevel.bind(this))
            .onGet(this.getFanLevel.bind(this));
        const pollSeconds = this.getPollSeconds();
        multiServiceAccessory.startPollingState(pollSeconds, this.getSwitchState.bind(this), fanService, platform.Characteristic.Active);
        multiServiceAccessory.startPollingState(pollSeconds, this.getFanLevel.bind(this), fanService, platform.Characteristic.RotationSpeed);
        return fanService;
    }
    setupOptionalModeSwitch(platform, multiServiceAccessory) {
        this.setServiceType(platform.Service.Switch);
        const switchService = this.service;
        switchService.getCharacteristic(platform.Characteristic.On)
            .onGet(this.getOptionalModeSwitchState.bind(this))
            .onSet(this.setOptionalModeSwitchState.bind(this));
        multiServiceAccessory.startPollingState(this.getPollSeconds(), this.getOptionalModeSwitchState.bind(this), switchService, platform.Characteristic.On);
        return switchService;
    }
    setupHumiditySensor(platform, multiServiceAccessory) {
        this.setServiceType(platform.Service.HumiditySensor);
        const humidityService = this.service;
        humidityService.getCharacteristic(platform.Characteristic.CurrentRelativeHumidity)
            .onGet(this.getHumidityLevel.bind(this));
        multiServiceAccessory.startPollingState(this.getPollSeconds(), this.getHumidityLevel.bind(this), humidityService, platform.Characteristic.CurrentRelativeHumidity);
        return humidityService;
    }
    setupLightSwitch(platform, multiServiceAccessory) {
        this.log.debug(`Expose Light Switch for ${this.name}`);
        this.setServiceType(platform.Service.Lightbulb); // Use Lightbulb service to control light intensity
        const lightService = this.service;
        lightService.getCharacteristic(platform.Characteristic.On)
            .onGet(this.getLightSwitchState.bind(this))
            .onSet(this.setLightSwitchState.bind(this));
        lightService.getCharacteristic(platform.Characteristic.Brightness)
            .onGet(this.getLightBrightness.bind(this))
            .onSet(this.setLightBrightness.bind(this));
        multiServiceAccessory.startPollingState(this.getPollSeconds(), this.getLightSwitchState.bind(this), lightService, platform.Characteristic.On);
        return lightService;
    }
    async getHumidityLevel() {
        const deviceStatus = await this.getDeviceStatus();
        return deviceStatus?.relativeHumidityMeasurement?.humidity?.value ?? 0;
    }
    levelToFanMode(level) {
        if (level > 0 && level < 25) {
            return FanMode.Low;
        }
        if (level > 25 && level <= 50) {
            return FanMode.Medium;
        }
        if (level > 50 && level <= 75) {
            return FanMode.High;
        }
        if (level > 75) {
            return FanMode.Turbo;
        }
        return FanMode.Auto;
    }
    fanModeToLevel(fanMode) {
        switch (fanMode) {
            case FanMode.Low:
                return 25;
            case FanMode.Medium:
                return 50;
            case FanMode.High:
                return 75;
            case FanMode.Turbo:
                return 100;
            default:
                return 0; // auto level
        }
    }
    fanOscillationModeToSwingMode(fanOscillationMode) {
        switch (fanOscillationMode) {
            case FanOscillationMode.All:
            case FanOscillationMode.Vertical:
                return this.platform.Characteristic.SwingMode.SWING_ENABLED;
            case FanOscillationMode.Fixed:
            default:
                return this.platform.Characteristic.SwingMode.SWING_DISABLED;
        }
    }
    async getLightSwitchState() {
        const deviceStatus = await this.getDeviceStatus();
        return (deviceStatus?.switchLevel?.level?.value ?? 0) > 0;
    }
    async setLightSwitchState(value) {
        const level = value ? 100 : 0; // 100 for on, 0 for off
        this.log.info(`[${this.name}] set light switch state to ${value}`);
        await this.sendCommandsOrFail([new smartThingsCommand_1.Command('switchLevel', 'setLevel', [level])]);
    }
    async getLightBrightness() {
        const deviceStatus = await this.getDeviceStatus();
        return deviceStatus?.switchLevel?.level?.value ?? 0;
    }
    async setLightBrightness(value) {
        this.log.info(`[${this.name}] set light brightness to ${value}`);
        await this.sendCommandsOrFail([new smartThingsCommand_1.Command('switchLevel', 'setLevel', [value])]);
    }
    async setOptionalModeSwitchState(value) {
        // if optional mode is not set, skip sending command
        if (!this.optionalMode) {
            return;
        }
        const mode = value ? this.optionalMode : OptionalMode.Off;
        this.log.info(`[${this.name}] set airConditionerOptionalMode to ${mode}`);
        await this.sendCommandsOrFail([new smartThingsCommand_1.Command('custom.airConditionerOptionalMode', 'setAcOptionalMode', [mode])]);
    }
    async getOptionalModeSwitchState() {
        const deviceStatus = await this.getDeviceStatus();
        return deviceStatus?.['custom.airConditionerOptionalMode']?.acOptionalMode?.value === this.optionalMode;
    }
    // Switch state is managed by the Fan service.
    // If fan is turned on, and thermostat is not active, sets the air conditioner to the Wind mode or mantains the current one.
    async setSwitchState(value) {
        const CurrentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState;
        const heatingCoolingState = await this.getCurrentHeatingCoolingState();
        const currentAirConditionerMode = this.targetHeatingCoolingStateToAirConditionerMode(heatingCoolingState);
        const airConditionerMode = heatingCoolingState === CurrentHeatingCoolingState.OFF ? AirConditionerMode.Wind : currentAirConditionerMode;
        const switchState = value ? SwitchState.On : SwitchState.Off;
        if (switchState === SwitchState.On) {
            this.log.info(`[${this.name}] set switch state to ${switchState} and airConditionerMode to ${airConditionerMode}`);
            await this.sendCommandsOrFail([
                new smartThingsCommand_1.Command('switch', switchState),
                new smartThingsCommand_1.Command('airConditionerMode', 'setAirConditionerMode', [airConditionerMode]),
            ]);
            return;
        }
        this.log.info(`[${this.name}] set switch state to ${switchState}.`);
        await this.sendCommandsOrFail([new smartThingsCommand_1.Command('switch', switchState)]);
    }
    async getSwitchState() {
        const deviceStatus = await this.getDeviceStatus();
        return deviceStatus?.switch?.switch?.value === SwitchState.On;
    }
    setFanLevel(value) {
        const fanMode = this.levelToFanMode(value);
        const command = new smartThingsCommand_1.Command('airConditionerFanMode', 'setFanMode', [fanMode]);
        this.log.info(`[${this.name}] set fan level to ${fanMode}`);
        return this.sendCommandsOrFail([command]);
    }
    async getFanLevel() {
        this.log.debug(`[${this.name}] get fan level`);
        const deviceStatus = await this.getDeviceStatus();
        const fanMode = deviceStatus?.airConditionerFanMode?.fanMode?.value;
        if (!fanMode) {
            return 0;
        }
        return this.fanModeToLevel(fanMode);
    }
    setSwingMode(value) {
        const mode = value === this.platform.Characteristic.SwingMode.SWING_ENABLED ? FanOscillationMode.All : FanOscillationMode.Fixed;
        this.log.info(`[${this.name}] set fan swing mode to ${mode}`);
        const command = new smartThingsCommand_1.Command('fanOscillationMode', 'setFanOscillationMode', [mode]);
        return this.sendCommandsOrFail([command]);
    }
    async getSwingMode() {
        this.log.debug(`[${this.name}] get fan swing mode`);
        const deviceStatus = await this.getDeviceStatus();
        const swingMode = deviceStatus?.fanOscillationMode?.fanOscillationMode?.value;
        return this.fanOscillationModeToSwingMode(swingMode);
    }
    airConditionerModeToTargetHeatingCoolingState(airConditionerMode) {
        const TargetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState;
        switch (airConditionerMode) {
            case AirConditionerMode.Dry:
            case AirConditionerMode.Cool:
                return TargetHeatingCoolingState.COOL;
            case AirConditionerMode.Heat:
                return TargetHeatingCoolingState.HEAT;
            case AirConditionerMode.Auto:
                return TargetHeatingCoolingState.AUTO;
            case AirConditionerMode.Wind:
            default:
                return TargetHeatingCoolingState.OFF;
        }
    }
    targetHeatingCoolingStateToAirConditionerMode(targetHeatingCoolingState) {
        const TargetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState;
        switch (targetHeatingCoolingState) {
            case TargetHeatingCoolingState.AUTO:
                return AirConditionerMode.Auto;
            case TargetHeatingCoolingState.COOL:
                return AirConditionerMode.Cool;
            case TargetHeatingCoolingState.HEAT:
                return AirConditionerMode.Heat;
            default:
                return undefined;
        }
    }
    async getTargetHeatingCoolingState() {
        this.log.debug(`[${this.name}] get target heating cooling state`);
        const deviceStatus = await this.getDeviceStatus();
        const isOff = deviceStatus?.switch?.switch?.value === 'off';
        const airConditionerMode = deviceStatus?.airConditionerMode?.airConditionerMode?.value;
        if (isOff || !airConditionerMode) {
            return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
        }
        return this.airConditionerModeToTargetHeatingCoolingState(airConditionerMode);
    }
    // Set the target state of the thermostat and turns it on or off by using the switch capability
    async setTargetHeatingCoolingState(value) {
        const airConditionerMode = this.targetHeatingCoolingStateToAirConditionerMode(value);
        this.log.info(`[${this.name}] set target heating cooling state to ${airConditionerMode}`);
        // When switching between modes, we always ask to turn on the air conditioner unless
        // the thermostat is set to off.
        const commands = airConditionerMode ?
            [
                new smartThingsCommand_1.Command('switch', SwitchState.On),
                new smartThingsCommand_1.Command('airConditionerMode', 'setAirConditionerMode', [airConditionerMode]),
            ]
            :
                [
                    new smartThingsCommand_1.Command('switch', SwitchState.Off),
                ];
        await this.sendCommandsOrFail(commands);
    }
    async getCurrentHeatingCoolingState() {
        this.log.debug(`[${this.name}] get current heating cooling state`);
        const deviceStatus = await this.getDeviceStatus();
        const CurrentHeatingCoolingState = this.platform.Characteristic.CurrentHeatingCoolingState;
        const airConditionerMode = deviceStatus?.airConditionerMode?.airConditionerMode?.value;
        const coolingSetpoint = this.toCelsius(deviceStatus?.thermostatCoolingSetpoint?.coolingSetpoint?.value ?? 24);
        const temperature = this.toCelsius(deviceStatus?.temperatureMeasurement?.temperature?.value ?? 24);
        const isOff = deviceStatus?.switch?.switch?.value === SwitchState.Off;
        if (isOff) {
            return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        }
        switch (airConditionerMode) {
            case AirConditionerMode.Cool:
                return CurrentHeatingCoolingState.COOL;
            case AirConditionerMode.Heat:
                return CurrentHeatingCoolingState.HEAT;
            case AirConditionerMode.Auto:
                return temperature > coolingSetpoint ? CurrentHeatingCoolingState.COOL : CurrentHeatingCoolingState.HEAT;
            default:
                return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
        }
    }
    async getCurrentTemperature() {
        this.log.debug(`[${this.name}] get current temperature`);
        const deviceStatus = await this.getDeviceStatus();
        const temp = deviceStatus?.temperatureMeasurement?.temperature?.value;
        const unit = deviceStatus?.temperatureMeasurement?.temperature?.unit;
        if (unit) {
            this.temperatureUnit = unit;
        }
        if (temp === null || temp === undefined || isNaN(Number(temp))) {
            return 20;
        }
        return this.toCelsius(Number(temp));
    }
    async getTargetTemperature() {
        this.log.debug(`[${this.name}] get target temperature`);
        const deviceStatus = await this.getDeviceStatus();
        const coolingSetpoint = deviceStatus?.thermostatCoolingSetpoint?.coolingSetpoint?.value;
        if (coolingSetpoint === null || coolingSetpoint === undefined || isNaN(Number(coolingSetpoint))) {
            return 24;
        }
        const celsius = this.toCelsius(Number(coolingSetpoint));
        return Math.min(Math.max(celsius, 10), 38);
    }
    setTargetTemperature(value) {
        this.log.info(`[${this.name}] set target temperature to ${value}`);
        const convertedTemp = this.fromCelsius(value);
        const command = new smartThingsCommand_1.Command('thermostatCoolingSetpoint', 'setCoolingSetpoint', [convertedTemp]);
        return this.sendCommandsOrFail([command]);
    }
    getTemperatureDisplayUnits() {
        this.log.debug(`[${this.name}] get temperatured dislay units`);
        return this.temperatureUnit === TemperatureUnit.Celsius
            ? this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS
            : this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }
    // converts to celsius if needed
    toCelsius(value) {
        return this.temperatureUnit === TemperatureUnit.Farenheit ? (value - 32) * (5 / 9) : value;
    }
    // converts to fahrenheit if needed
    fromCelsius(value) {
        return this.temperatureUnit === TemperatureUnit.Farenheit ? (value * (9 / 5)) + 32 : value;
    }
    async sendCommandsOrFail(commands) {
        if (!this.multiServiceAccessory.isOnline()) {
            this.log.error(this.name + ' is offline');
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        if (!await this.multiServiceAccessory.sendCommands(commands)) {
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
    }
    async getDeviceStatus() {
        if (!await this.getStatus()) {
            throw new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        return this.deviceStatus.status;
    }
    processEvent(event) {
        const TargetHeatingCoolingState = this.platform.Characteristic.TargetHeatingCoolingState;
        this.log.info(`[${this.name}] Event updating ${event.capability} capability to ${event.value}`);
        let temperature;
        let targetHeatingCoolingState;
        let fanOscillationMode;
        switch (event.capability) {
            case 'thermostatCoolingSetpoint':
                temperature = this.toCelsius(event.value);
                this.thermostatService.updateCharacteristic(this.platform.Characteristic.TargetTemperature, temperature);
                break;
            case 'airConditionerMode':
                targetHeatingCoolingState = this.airConditionerModeToTargetHeatingCoolingState(event.value);
                this.thermostatService.updateCharacteristic(TargetHeatingCoolingState, targetHeatingCoolingState);
                break;
            case 'airConditionerFanMode':
                this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, this.fanModeToLevel(event.value));
                break;
            case 'fanOscillationMode':
                fanOscillationMode = event.value;
                this.fanService.updateCharacteristic(this.platform.Characteristic.SwingMode, this.fanOscillationModeToSwingMode(fanOscillationMode));
                break;
            case 'switch':
                this.fanService.updateCharacteristic(this.platform.Characteristic.Active, event.value === SwitchState.On);
                break;
            case 'relativeHumidityMeasurement':
                this.humidityService?.updateCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity, event.value);
                break;
            case 'custom.airConditionerOptionalMode':
                this.optionalModeSwitchService?.updateCharacteristic(this.platform.Characteristic.On, event.value === this.optionalMode);
                break;
            case 'switchLevel':
                this.lightService?.updateCharacteristic(this.platform.Characteristic.On, event.value > 0);
                this.lightService?.updateCharacteristic(this.platform.Characteristic.Brightness, event.value);
                break;
            default:
                this.log.info(`[${this.name}] Ignore event updating ${event.capability} capability to ${event.value}`);
                break;
        }
    }
}
exports.AirConditionerService = AirConditionerService;
//# sourceMappingURL=airConditionerService.js.map