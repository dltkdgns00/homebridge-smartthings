"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiServiceAccessory = void 0;
const axios_1 = __importDefault(require("axios"));
const motionService_1 = require("./services/motionService");
const batteryService_1 = require("./services/batteryService");
const temperatureService_1 = require("./services/temperatureService");
const humidityService_1 = require("./services/humidityService");
const lightSensorService_1 = require("./services/lightSensorService");
const contactSensorService_1 = require("./services/contactSensorService");
const lockService_1 = require("./services/lockService");
const doorService_1 = require("./services/doorService");
const switchService_1 = require("./services/switchService");
const lightService_1 = require("./services/lightService");
const fanSwitchLevelService_1 = require("./services/fanSwitchLevelService");
const occupancySensorService_1 = require("./services/occupancySensorService");
const leakDetector_1 = require("./services/leakDetector");
const smokeDetector_1 = require("./services/smokeDetector");
const carbonMonoxideDetector_1 = require("./services/carbonMonoxideDetector");
const valveService_1 = require("./services/valveService");
const fanSpeedService_1 = require("./services/fanSpeedService");
const windowCoveringService_1 = require("./services/windowCoveringService");
const thermostatService_1 = require("./services/thermostatService");
const statelessProgrammableSwitchService_1 = require("./services/statelessProgrammableSwitchService");
const airConditionerService_1 = require("./services/airConditionerService");
const robotVacuumService_1 = require("./services/robotVacuumService");
const televisionService_1 = require("./services/televisionService");
const smartThingsCommand_1 = require("./services/smartThingsCommand");
/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
class MultiServiceAccessory {
    components = [];
    services = [];
    // Global request throttling and 429 rate-limit protection
    static requestQueue = Promise.resolve();
    static rateLimitResetTime = 0;
    static MIN_REQUEST_INTERVAL_MS = 120;
    // Order of these matters. Make sure secondary capabilities like 'battery' and 'contactSensor' are at the end.
    static capabilityMap = {
        doorControl: doorService_1.DoorService,
        lock: lockService_1.LockService,
        'samsungce.robotCleanerOperatingState': robotVacuumService_1.RobotVacuumService,
        robotCleanerMovement: robotVacuumService_1.RobotVacuumService,
        robotCleanerCleaningMode: robotVacuumService_1.RobotVacuumService,
        switch: switchService_1.SwitchService,
        windowShadeLevel: windowCoveringService_1.WindowCoveringService,
        windowShade: windowCoveringService_1.WindowCoveringService,
        motionSensor: motionService_1.MotionService,
        waterSensor: leakDetector_1.LeakDetectorService,
        smokeDetector: smokeDetector_1.SmokeDetectorService,
        carbonMonoxideDetector: carbonMonoxideDetector_1.CarbonMonoxideDetectorService,
        presenceSensor: occupancySensorService_1.OccupancySensorService,
        temperatureMeasurement: temperatureService_1.TemperatureService,
        relativeHumidityMeasurement: humidityService_1.HumidityService,
        illuminanceMeasurement: lightSensorService_1.LightSensorService,
        contactSensor: contactSensorService_1.ContactSensorService,
        button: statelessProgrammableSwitchService_1.StatelessProgrammableSwitchService,
        battery: batteryService_1.BatteryService,
        valve: valveService_1.ValveService,
    };
    // Maps combinations of supported capabilities to a service
    static comboCapabilityMap = [
        {
            capabilities: [
                'switch',
                'airConditionerMode',
                'airConditionerFanMode',
                'thermostatCoolingSetpoint',
                'temperatureMeasurement',
            ],
            optionalCapabilities: [
                'fanOscillationMode',
                'relativeHumidityMeasurement',
                'custom.airConditionerOptionalMode',
                'switchLevel',
            ],
            service: airConditionerService_1.AirConditionerService,
        },
        {
            capabilities: ['switch', 'audioVolume'],
            optionalCapabilities: [
                'audioMute',
                'tvChannel',
                'mediaInputSource',
                'samsungvd.mediaInputSource',
                'mediaPlayback',
            ],
            service: televisionService_1.TelevisionService,
        },
        {
            capabilities: ['samsungce.robotCleanerOperatingState'],
            optionalCapabilities: [
                'robotCleanerMovement',
                'robotCleanerCleaningMode',
                'switch',
            ],
            service: robotVacuumService_1.RobotVacuumService,
        },
        {
            capabilities: ['robotCleanerMovement'],
            optionalCapabilities: ['robotCleanerCleaningMode', 'switch'],
            service: robotVacuumService_1.RobotVacuumService,
        },
        {
            capabilities: ['robotCleanerCleaningMode'],
            optionalCapabilities: ['switch'],
            service: robotVacuumService_1.RobotVacuumService,
        },
        {
            capabilities: ['switch', 'fanSpeed', 'switchLevel'],
            service: fanSwitchLevelService_1.FanSwitchLevelService,
        },
        {
            capabilities: ['switch', 'fanSpeed'],
            service: fanSpeedService_1.FanSpeedService,
        },
        {
            capabilities: ['switch', 'switchLevel'],
            service: lightService_1.LightService,
        },
        {
            capabilities: ['switch', 'colorControl'],
            service: lightService_1.LightService,
        },
        {
            capabilities: ['switch', 'colorTemperature'],
            service: lightService_1.LightService,
        },
        {
            capabilities: ['switch', 'valve'],
            service: valveService_1.ValveService,
        },
        {
            capabilities: ['temperatureMeasurement', 'thermostatHeatingSetpoint'],
            optionalCapabilities: [
                'thermostatMode',
                'thermostatCoolingSetpoint',
                'thermostatOperatingState',
                'switch',
            ],
            service: thermostatService_1.ThermostatService,
        },
        {
            capabilities: ['windowShade', 'windowShadeLevel'],
            service: windowCoveringService_1.WindowCoveringService,
        },
        {
            capabilities: ['windowShade', 'switchLevel'],
            service: windowCoveringService_1.WindowCoveringService,
        },
    ];
    accessory;
    platform;
    name;
    characteristic;
    log;
    baseURL;
    key;
    axInstance;
    commandURL;
    statusURL;
    healthURL;
    api;
    online = true;
    deviceStatusTimestamp = 0;
    failureCount = 0;
    giveUpTime = 0;
    commandInProgress = false;
    lastCommandCompleted = 0;
    statusQueryInProgress = false;
    lastStatusResult = true;
    get id() {
        return this.accessory.UUID;
    }
    constructor(platform, accessory) {
        this.accessory = accessory;
        this.platform = platform;
        this.name = accessory.context.device.label;
        this.log = platform.log;
        this.baseURL = platform.config.BaseURL;
        this.key = platform.config.AccessToken;
        this.api = platform.api;
        const headerDict = { Authorization: 'Bearer: ' + this.key };
        this.axInstance = axios_1.default.create({
            baseURL: this.baseURL,
            headers: headerDict,
            timeout: 15000,
        });
        this.commandURL =
            'devices/' + accessory.context.device.deviceId + '/commands';
        this.statusURL = 'devices/' + accessory.context.device.deviceId + '/status';
        this.healthURL = 'devices/' + accessory.context.device.deviceId + '/health';
        this.characteristic = platform.Characteristic;
        // set accessory information
        accessory
            .getService(platform.Service.AccessoryInformation)
            .setCharacteristic(platform.Characteristic.Manufacturer, accessory.context.device.manufacturerName || 'SmartThings')
            .setCharacteristic(platform.Characteristic.Model, 'Default-Model')
            .setCharacteristic(platform.Characteristic.SerialNumber, 'Default-Serial');
    }
    static enqueueStatusRequest(fn) {
        const next = MultiServiceAccessory.requestQueue.then(async () => {
            const waitMs = MultiServiceAccessory.rateLimitResetTime - Date.now();
            if (waitMs > 0) {
                await new Promise((r) => setTimeout(r, Math.min(waitMs, 5000)));
            }
            await new Promise((r) => setTimeout(r, MultiServiceAccessory.MIN_REQUEST_INTERVAL_MS));
        });
        MultiServiceAccessory.requestQueue = next.catch(() => undefined);
        return next.then(fn);
    }
    registerServiceIfMatchesCapabilities(componentId, component, capabilitiesToCover, capabilities, optionalCapabilities, serviceConstructor) {
        // ignore services which cannot cover all required capabilities
        if (!capabilities.every((e) => capabilitiesToCover.includes(e))) {
            return capabilitiesToCover;
        }
        const allCapabilities = capabilities.concat(optionalCapabilities.filter((e) => capabilitiesToCover.includes(e)));
        this.log.debug(`Creating instance of ${serviceConstructor.name} for capabilities ${allCapabilities}`);
        const serviceInstance = new serviceConstructor(this.platform, this.accessory, componentId, allCapabilities, this, this.name, component);
        this.services.push(serviceInstance);
        this.log.debug(`Registered ${serviceConstructor.name} for capabilities ${allCapabilities}`);
        // remove covered capabilities and return unused
        return capabilitiesToCover.filter((e) => !allCapabilities.includes(e));
    }
    addComponent(componentId, capabilities) {
        const component = {
            componentId,
            capabilities,
            status: {},
        };
        this.components.push(component);
        let capabilitiesToCover = [...capabilities];
        // Start with comboServices and remove used capabilities to avoid duplicated sensors.
        MultiServiceAccessory.comboCapabilityMap
            .sort((a, b) => (a.capabilities.length > b.capabilities.length ? -1 : 1))
            .forEach((entry) => {
            capabilitiesToCover = this.registerServiceIfMatchesCapabilities(componentId, component, capabilitiesToCover, entry.capabilities, entry.optionalCapabilities || [], entry.service);
        });
        Object.keys(MultiServiceAccessory.capabilityMap).forEach((capability) => {
            const service = MultiServiceAccessory.capabilityMap[capability];
            capabilitiesToCover = this.registerServiceIfMatchesCapabilities(componentId, component, capabilitiesToCover, [capability], [], service);
        });
    }
    isOnline() {
        if (!this.online &&
            this.giveUpTime > 0 &&
            Date.now() - this.giveUpTime > 5 * 60 * 1000) {
            this.log.info(`Re-enabling ${this.name} after offline cooldown`);
            this.online = true;
            this.giveUpTime = 0;
            this.failureCount = 0;
        }
        return this.online;
    }
    // Find return if a capability is supported by the multi-service accessory
    static capabilitySupported(capability) {
        if (Object.keys(MultiServiceAccessory.capabilityMap).find((c) => c === capability)) {
            return true;
        }
        for (const entry of MultiServiceAccessory.comboCapabilityMap) {
            if (entry.capabilities.includes(capability)) {
                return true;
            }
        }
        return false;
    }
    hasCachedStatus() {
        return this.components.some((c) => c.status && Object.keys(c.status).length > 0);
    }
    // Called by subclasses to refresh the status for the device.
    async refreshStatus() {
        return new Promise((resolve) => {
            this.log.debug(`Refreshing status for ${this.name} - current timestamp is ${this.deviceStatusTimestamp}`);
            if (Date.now() - this.deviceStatusTimestamp > 8000) {
                // If there is already a call to smartthings to update status for this device, don't issue another one until
                // we return from that.
                if (this.statusQueryInProgress) {
                    this.log.debug(`Status query already in progress for ${this.name}. Waiting...`);
                    this.waitFor(() => !this.statusQueryInProgress).then(() => resolve(this.lastStatusResult));
                    return;
                }
                // If global rate limit cooldown is active and we already have cached status, reuse it to avoid 429 errors
                if (Date.now() < MultiServiceAccessory.rateLimitResetTime &&
                    this.hasCachedStatus()) {
                    this.log.debug(`Rate limit cooldown active, reusing cached status for ${this.name}`);
                    resolve(true);
                    return;
                }
                this.log.debug(`Calling Smartthings to get an update for ${this.name}`);
                this.statusQueryInProgress = true;
                this.waitFor(() => this.commandInProgress === false).then(() => {
                    MultiServiceAccessory.enqueueStatusRequest(() => this.axInstance.get(this.statusURL))
                        .then((res) => {
                        const componentsStatus = res.data?.components || {};
                        this.failureCount = 0;
                        this.online = true;
                        this.giveUpTime = 0;
                        this.lastStatusResult = true;
                        this.deviceStatusTimestamp = Date.now();
                        this.components.forEach((component) => {
                            if (componentsStatus[component.componentId] !== undefined) {
                                component.status = componentsStatus[component.componentId];
                                this.log.debug(`Updated status for ${this.name}-${component.componentId}: ${JSON.stringify(component.status)}`);
                            }
                            else {
                                this.log.error(`Failed to get status for ${this.name}-${component.componentId}`);
                            }
                        });
                        this.statusQueryInProgress = false;
                        resolve(true);
                    })
                        .catch((error) => {
                        const statusCode = error?.response?.status;
                        if (statusCode === 429) {
                            const retryAfter = Number(error?.response?.headers?.['retry-after']) || 15;
                            MultiServiceAccessory.rateLimitResetTime =
                                Date.now() + retryAfter * 1000;
                            this.log.warn(`SmartThings API rate limit (429) hit while querying ${this.name}. Backing off for ${retryAfter}s.`);
                            this.statusQueryInProgress = false;
                            resolve((this.lastStatusResult = this.hasCachedStatus()));
                            return;
                        }
                        this.failureCount++;
                        this.log.error(`Failed to request status from ${this.name}: ${error}. This is failure number ${this.failureCount}`);
                        if (this.failureCount >= 5) {
                            this.log.error(`Exceeded allowed failures for ${this.name}. Device is offline (will retry in 5 minutes)`);
                            this.giveUpTime = Date.now();
                            this.online = false;
                        }
                        this.statusQueryInProgress = false;
                        resolve((this.lastStatusResult = false));
                    });
                });
            }
            else {
                resolve(true);
            }
        });
    }
    forceNextStatusRefresh() {
        this.deviceStatusTimestamp = 0;
    }
    startPollingState(pollSeconds, getValue, service, chracteristic, targetStateCharacteristic, getTargetState) {
        if (this.platform.config.WebhookToken &&
            this.platform.config.WebhookToken !== '') {
            return; // Don't poll if we have a webhook token
        }
        if (pollSeconds > 0) {
            return setInterval(() => {
                // If we are in the middle of a command call, or it hasn't been at least 20 seconds, we don't want to poll.
                if (this.commandInProgress ||
                    Date.now() - this.lastCommandCompleted < 20 * 1000) {
                    this.log.debug(`Command in progress, skipping polling for ${this.name}`);
                    return;
                }
                if (this.isOnline()) {
                    this.log.debug(`${this.name} polling...`);
                    getValue()
                        .then((v) => {
                        service.updateCharacteristic(chracteristic, v);
                        this.log.debug(`${this.name} value updated.`);
                    })
                        .catch(() => {
                        this.log.debug(`Poll failure on ${this.name}`);
                        return;
                    });
                    // Update target if we have to
                    if (targetStateCharacteristic && getTargetState) {
                        getTargetState()
                            .then((value) => service.updateCharacteristic(targetStateCharacteristic, value))
                            .catch(() => undefined);
                    }
                }
            }, pollSeconds * 1000 + Math.floor(Math.random() * 3000));
        }
    }
    async sendCommand(capability, command, args) {
        const cmd = new smartThingsCommand_1.Command(capability, command, args);
        return this.sendCommands([cmd]);
    }
    async sendCommands(commands) {
        const commandBody = JSON.stringify({ commands: commands });
        return new Promise((resolve) => {
            this.waitFor(() => !this.commandInProgress).then(() => {
                this.commandInProgress = true;
                this.axInstance
                    .post(this.commandURL, commandBody)
                    .then(() => {
                    this.log.debug(`${JSON.stringify(commands)} successful for ${this.name}`);
                    this.deviceStatusTimestamp = 0; // Force a refresh on next poll after a state change
                    this.lastCommandCompleted = Date.now();
                    this.commandInProgress = false;
                    resolve(true);
                })
                    .catch((error) => {
                    this.commandInProgress = false;
                    this.log.error(`${JSON.stringify(commands)} failed for ${this.name}: ${error}`);
                    resolve(false);
                });
            });
        });
    }
    // Wait for the condition to be true. Will check every 250 ms
    async waitFor(condition) {
        if (condition()) {
            return;
        }
        this.log.debug(`${this.name} command or request is waiting...`);
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (condition()) {
                    this.log.debug(`${this.name} command or request is proceeding.`);
                    clearInterval(interval);
                    resolve();
                }
                this.log.debug(`${this.name} still waiting...`);
            }, 250);
        });
    }
    processEvent(event) {
        this.log.debug(`Received events for ${this.name}`);
        const service = this.services.find((s) => s.componentId === event.componentId &&
            s.capabilities.find((c) => c === event.capability));
        if (service) {
            this.log.debug(`Event for ${this.name}:${event.componentId} - ${event.value}`);
            service.processEvent(event);
        }
    }
}
exports.MultiServiceAccessory = MultiServiceAccessory;
//# sourceMappingURL=multiServiceAccessory.js.map