import {
  PlatformAccessory,
  Characteristic,
  CharacteristicValue,
  Service,
  WithUUID,
  Logger,
  API,
} from 'homebridge';
import axios, { AxiosInstance } from 'axios';
import { IKHomeBridgeHomebridgePlatform } from './platform';
import { BaseService } from './services/baseService';
import { MotionService } from './services/motionService';
import { BatteryService } from './services/batteryService';
import { TemperatureService } from './services/temperatureService';
import { HumidityService } from './services/humidityService';
import { LightSensorService } from './services/lightSensorService';
import { ContactSensorService } from './services/contactSensorService';
import { LockService } from './services/lockService';
import { DoorService } from './services/doorService';
import { SwitchService } from './services/switchService';
import { LightService } from './services/lightService';
import { FanSwitchLevelService } from './services/fanSwitchLevelService';
import { OccupancySensorService } from './services/occupancySensorService';
import { LeakDetectorService } from './services/leakDetector';
import { SmokeDetectorService } from './services/smokeDetector';
import { CarbonMonoxideDetectorService } from './services/carbonMonoxideDetector';
import { ValveService } from './services/valveService';
import { ShortEvent } from './webhook/subscriptionHandler';
import { FanSpeedService } from './services/fanSpeedService';
import { WindowCoveringService } from './services/windowCoveringService';
import { ThermostatService } from './services/thermostatService';
import { StatelessProgrammableSwitchService } from './services/statelessProgrammableSwitchService';
import { AirConditionerService } from './services/airConditionerService';
import { RobotVacuumService } from './services/robotVacuumService';
import { TelevisionService } from './services/televisionService';
import { Command } from './services/smartThingsCommand';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class MultiServiceAccessory {
  components: {
    componentId: string;
    capabilities: string[];
    status: Record<string, unknown>;
  }[] = [];

  private services: BaseService[] = [];

  // Global request throttling and 429 rate-limit protection
  private static requestQueue: Promise<void> = Promise.resolve();
  private static rateLimitResetTime = 0;
  private static readonly MIN_REQUEST_INTERVAL_MS = 120;

  // Order of these matters. Make sure secondary capabilities like 'battery' and 'contactSensor' are at the end.
  private static capabilityMap = {
    doorControl: DoorService,
    lock: LockService,
    'samsungce.robotCleanerOperatingState': RobotVacuumService,
    robotCleanerMovement: RobotVacuumService,
    robotCleanerCleaningMode: RobotVacuumService,
    switch: SwitchService,
    windowShadeLevel: WindowCoveringService,
    windowShade: WindowCoveringService,
    motionSensor: MotionService,
    waterSensor: LeakDetectorService,
    smokeDetector: SmokeDetectorService,
    carbonMonoxideDetector: CarbonMonoxideDetectorService,
    presenceSensor: OccupancySensorService,
    temperatureMeasurement: TemperatureService,
    relativeHumidityMeasurement: HumidityService,
    illuminanceMeasurement: LightSensorService,
    contactSensor: ContactSensorService,
    button: StatelessProgrammableSwitchService,
    battery: BatteryService,
    valve: ValveService,
  };

  // Maps combinations of supported capabilities to a service
  private static comboCapabilityMap = [
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
      service: AirConditionerService,
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
      service: TelevisionService,
    },
    {
      capabilities: ['samsungce.robotCleanerOperatingState'],
      optionalCapabilities: [
        'robotCleanerMovement',
        'robotCleanerCleaningMode',
        'switch',
      ],
      service: RobotVacuumService,
    },
    {
      capabilities: ['robotCleanerMovement'],
      optionalCapabilities: ['robotCleanerCleaningMode', 'switch'],
      service: RobotVacuumService,
    },
    {
      capabilities: ['robotCleanerCleaningMode'],
      optionalCapabilities: ['switch'],
      service: RobotVacuumService,
    },
    {
      capabilities: ['switch', 'fanSpeed', 'switchLevel'],
      service: FanSwitchLevelService,
    },
    {
      capabilities: ['switch', 'fanSpeed'],
      service: FanSpeedService,
    },
    {
      capabilities: ['switch', 'switchLevel'],
      service: LightService,
    },
    {
      capabilities: ['switch', 'colorControl'],
      service: LightService,
    },
    {
      capabilities: ['switch', 'colorTemperature'],
      service: LightService,
    },
    {
      capabilities: ['switch', 'valve'],
      service: ValveService,
    },
    {
      capabilities: ['temperatureMeasurement', 'thermostatHeatingSetpoint'],
      optionalCapabilities: [
        'thermostatMode',
        'thermostatCoolingSetpoint',
        'thermostatOperatingState',
        'switch',
      ],
      service: ThermostatService,
    },
    {
      capabilities: ['windowShade', 'windowShadeLevel'],
      service: WindowCoveringService,
    },
    {
      capabilities: ['windowShade', 'switchLevel'],
      service: WindowCoveringService,
    },
  ];

  protected accessory: PlatformAccessory;
  protected platform: IKHomeBridgeHomebridgePlatform;
  public readonly name: string;
  protected characteristic: typeof Characteristic;
  protected log: Logger;
  protected baseURL: string;
  protected key: string;
  protected axInstance: AxiosInstance;
  protected commandURL: string;
  protected statusURL: string;
  protected healthURL: string;
  protected api: API;
  protected online = true;
  protected deviceStatusTimestamp = 0;
  protected failureCount = 0;
  protected giveUpTime = 0;
  protected commandInProgress = false;
  protected lastCommandCompleted = 0;

  protected statusQueryInProgress = false;
  protected lastStatusResult = true;

  get id() {
    return this.accessory.UUID;
  }

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
  ) {
    this.accessory = accessory;
    this.platform = platform;
    this.name = accessory.context.device.label;
    this.log = platform.log;
    this.baseURL = platform.config.BaseURL;
    this.key = platform.config.AccessToken;
    this.api = platform.api;
    const headerDict = { Authorization: 'Bearer: ' + this.key };

    this.axInstance = axios.create({
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
      .getService(platform.Service.AccessoryInformation)!
      .setCharacteristic(
        platform.Characteristic.Manufacturer,
        accessory.context.device.manufacturerName || 'SmartThings',
      )
      .setCharacteristic(platform.Characteristic.Model, 'Default-Model')
      .setCharacteristic(
        platform.Characteristic.SerialNumber,
        'Default-Serial',
      );
  }

  private static enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
    const next = MultiServiceAccessory.requestQueue.then(async () => {
      const waitMs = MultiServiceAccessory.rateLimitResetTime - Date.now();
      if (waitMs > 0) {
        await new Promise((r) => setTimeout(r, Math.min(waitMs, 5000)));
      }
      await new Promise((r) =>
        setTimeout(r, MultiServiceAccessory.MIN_REQUEST_INTERVAL_MS),
      );
    });
    MultiServiceAccessory.requestQueue = next.catch(() => undefined);
    return next.then(fn);
  }

  private registerServiceIfMatchesCapabilities(
    componentId: string,
    component: any,
    capabilitiesToCover: string[],
    capabilities: string[],
    optionalCapabilities: string[],
    serviceConstructor: any,
  ): string[] {
    // ignore services which cannot cover all required capabilities
    if (!capabilities.every((e) => capabilitiesToCover.includes(e))) {
      return capabilitiesToCover;
    }

    const allCapabilities = capabilities.concat(
      optionalCapabilities.filter((e) => capabilitiesToCover.includes(e)),
    );

    this.log.debug(
      `Creating instance of ${serviceConstructor.name} for capabilities ${allCapabilities}`,
    );
    const serviceInstance = new serviceConstructor(
      this.platform,
      this.accessory,
      componentId,
      allCapabilities,
      this,
      this.name,
      component,
    );
    this.services.push(serviceInstance);

    this.log.debug(
      `Registered ${serviceConstructor.name} for capabilities ${allCapabilities}`,
    );
    // remove covered capabilities and return unused
    return capabilitiesToCover.filter((e) => !allCapabilities.includes(e));
  }

  public addComponent(componentId: string, capabilities: string[]) {
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
        capabilitiesToCover = this.registerServiceIfMatchesCapabilities(
          componentId,
          component,
          capabilitiesToCover,
          entry.capabilities,
          entry.optionalCapabilities || [],
          entry.service,
        );
      });

    Object.keys(MultiServiceAccessory.capabilityMap).forEach((capability) => {
      const service = MultiServiceAccessory.capabilityMap[capability];
      capabilitiesToCover = this.registerServiceIfMatchesCapabilities(
        componentId,
        component,
        capabilitiesToCover,
        [capability],
        [],
        service,
      );
    });
  }

  public isOnline(): boolean {
    if (
      !this.online &&
      this.giveUpTime > 0 &&
      Date.now() - this.giveUpTime > 5 * 60 * 1000
    ) {
      this.log.info(`Re-enabling ${this.name} after offline cooldown`);
      this.online = true;
      this.giveUpTime = 0;
      this.failureCount = 0;
    }
    return this.online;
  }

  // Find return if a capability is supported by the multi-service accessory
  public static capabilitySupported(capability: string): boolean {
    if (
      Object.keys(MultiServiceAccessory.capabilityMap).find(
        (c) => c === capability,
      )
    ) {
      return true;
    }
    for (const entry of MultiServiceAccessory.comboCapabilityMap) {
      if (entry.capabilities.includes(capability)) {
        return true;
      }
    }
    return false;
  }

  private hasCachedStatus(): boolean {
    return this.components.some(
      (c) => c.status && Object.keys(c.status).length > 0,
    );
  }

  // Called by subclasses to refresh the status for the device.
  async refreshStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      this.log.debug(
        `Refreshing status for ${this.name} - current timestamp is ${this.deviceStatusTimestamp}`,
      );
      if (Date.now() - this.deviceStatusTimestamp > 8000) {
        // If there is already a call to smartthings to update status for this device, don't issue another one until
        // we return from that.
        if (this.statusQueryInProgress) {
          this.log.debug(
            `Status query already in progress for ${this.name}. Waiting...`,
          );
          this.waitFor(() => !this.statusQueryInProgress).then(() =>
            resolve(this.lastStatusResult),
          );
          return;
        }

        // If global rate limit cooldown is active and we already have cached status, reuse it to avoid 429 errors
        if (
          Date.now() < MultiServiceAccessory.rateLimitResetTime &&
          this.hasCachedStatus()
        ) {
          this.log.debug(
            `Rate limit cooldown active, reusing cached status for ${this.name}`,
          );
          resolve(true);
          return;
        }

        this.log.debug(`Calling Smartthings to get an update for ${this.name}`);
        this.statusQueryInProgress = true;
        this.waitFor(() => this.commandInProgress === false).then(() => {
          MultiServiceAccessory.enqueueRequest(() =>
            this.axInstance.get(this.statusURL),
          )
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
                  this.log.debug(
                    `Updated status for ${this.name}-${component.componentId}: ${JSON.stringify(component.status)}`,
                  );
                } else {
                  this.log.error(
                    `Failed to get status for ${this.name}-${component.componentId}`,
                  );
                }
              });
              this.statusQueryInProgress = false;
              resolve(true);
            })
            .catch((error) => {
              const statusCode = error?.response?.status;
              if (statusCode === 429) {
                const retryAfter =
                  Number(error?.response?.headers?.['retry-after']) || 15;
                MultiServiceAccessory.rateLimitResetTime =
                  Date.now() + retryAfter * 1000;
                this.log.warn(
                  `SmartThings API rate limit (429) hit while querying ${this.name}. Backing off for ${retryAfter}s.`,
                );
                this.statusQueryInProgress = false;
                resolve((this.lastStatusResult = this.hasCachedStatus()));
                return;
              }

              this.failureCount++;
              this.log.error(
                `Failed to request status from ${this.name}: ${error}. This is failure number ${this.failureCount}`,
              );
              if (this.failureCount >= 5) {
                this.log.error(
                  `Exceeded allowed failures for ${this.name}. Device is offline (will retry in 5 minutes)`,
                );
                this.giveUpTime = Date.now();
                this.online = false;
              }
              this.statusQueryInProgress = false;
              resolve((this.lastStatusResult = false));
            });
        });
      } else {
        resolve(true);
      }
    });
  }

  public forceNextStatusRefresh() {
    this.deviceStatusTimestamp = 0;
  }

  startPollingState(
    pollSeconds: number,
    getValue: () => Promise<CharacteristicValue>,
    service: Service,
    chracteristic: WithUUID<new () => Characteristic>,
    targetStateCharacteristic?: WithUUID<new () => Characteristic>,
    getTargetState?: () => Promise<CharacteristicValue>,
  ): ReturnType<typeof setInterval> | void {
    if (
      this.platform.config.WebhookToken &&
      this.platform.config.WebhookToken !== ''
    ) {
      return; // Don't poll if we have a webhook token
    }

    if (pollSeconds > 0) {
      return setInterval(
        () => {
          // If we are in the middle of a command call, or it hasn't been at least 20 seconds, we don't want to poll.
          if (
            this.commandInProgress ||
            Date.now() - this.lastCommandCompleted < 20 * 1000
          ) {
            this.log.debug(
              `Command in progress, skipping polling for ${this.name}`,
            );
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
                .then((value) =>
                  service.updateCharacteristic(
                    targetStateCharacteristic,
                    value,
                  ),
                )
                .catch(() => undefined);
            }
          }
        },
        pollSeconds * 1000 + Math.floor(Math.random() * 3000),
      );
    }
  }

  async sendCommand(
    capability: string,
    command: string,
    args?: unknown[],
  ): Promise<boolean> {
    const cmd = new Command(capability, command, args);
    return this.sendCommands([cmd]);
  }

  async sendCommands(commands: Command[], retryCount = 0): Promise<boolean> {
    const commandBody = JSON.stringify({ commands: commands });
    return new Promise((resolve) => {
      this.waitFor(() => !this.commandInProgress).then(async () => {
        this.commandInProgress = true;
        try {
          await MultiServiceAccessory.enqueueRequest(() =>
            this.axInstance.post(this.commandURL, commandBody),
          );
          this.log.debug(
            `${JSON.stringify(commands)} successful for ${this.name}`,
          );
          this.deviceStatusTimestamp = 0; // Force a refresh on next poll after a state change
          this.lastCommandCompleted = Date.now();
          this.commandInProgress = false;
          resolve(true);
        } catch (error: any) {
          this.commandInProgress = false;
          const statusCode = error?.response?.status;

          if (statusCode === 429) {
            const retryAfter =
              Number(error?.response?.headers?.['retry-after']) || 5;
            MultiServiceAccessory.rateLimitResetTime =
              Date.now() + retryAfter * 1000;
            this.log.warn(
              `SmartThings command rate limit (429) for ${this.name}. Backing off for ${retryAfter}s.`,
            );
            if (retryCount < 2) {
              await new Promise((r) => setTimeout(r, retryAfter * 1000));
              const retrySuccess = await this.sendCommands(
                commands,
                retryCount + 1,
              );
              resolve(retrySuccess);
              return;
            }
          } else if (statusCode === 409) {
            this.log.warn(
              `${JSON.stringify(commands)} conflict (409) for ${this.name}: device is likely already in target state`,
            );
            this.deviceStatusTimestamp = 0;
            resolve(true);
            return;
          }

          this.log.error(
            `${JSON.stringify(commands)} failed for ${this.name}: ${error}`,
          );
          resolve(false);
        }
      });
    });
  }

  // Wait for the condition to be true. Will check every 250 ms
  private async waitFor(condition: () => boolean): Promise<void> {
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

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Received events for ${this.name}`);

    const service = this.services.find(
      (s) =>
        s.componentId === event.componentId &&
        s.capabilities.find((c) => c === event.capability),
    );

    if (service) {
      this.log.debug(
        `Event for ${this.name}:${event.componentId} - ${event.value}`,
      );
      service.processEvent(event);
    }
  }
}
