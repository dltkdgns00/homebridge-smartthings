import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class FanSwitchLevelService extends BaseService {
  private setLevelDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private lastSentLevel: number | undefined;

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);
    this.setServiceType(platform.Service.Fan);

    this.log.debug(`Adding FanSwitchLevelService to ${this.name}`);
    this.service.getCharacteristic(platform.Characteristic.On)
      .onGet(this.getSwitchState.bind(this))
      .onSet(this.setSwitchState.bind(this));

    this.service.getCharacteristic(platform.Characteristic.RotationSpeed)
      .onSet(this.setLevel.bind(this))
      .onGet(this.getLevel.bind(this));

    let pollSwitchesAndLightsSeconds = 10;
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSwitchesAndLightsSeconds > 0) {
      multiServiceAccessory.startPollingState(
        pollSwitchesAndLightsSeconds,
        this.getSwitchState.bind(this),
        this.service,
        platform.Characteristic.On,
        platform.Characteristic.RotationSpeed,
        this.getLevel.bind(this),
      );
    }
  }

  async setSwitchState(value: CharacteristicValue) {
    this.log.debug('Received setSwitchState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const turnOn = Boolean(value);
    if (!turnOn) {
      if (this.setLevelDebounceTimer) {
        clearTimeout(this.setLevelDebounceTimer);
        this.setLevelDebounceTimer = undefined;
      }
      this.lastSentLevel = 0;
      const success = await this.multiServiceAccessory.sendCommand('switch', 'off');
      if (success) {
        this.log.debug('onSet(off) SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
      } else {
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
    } else {
      this.log.error(`Command failed for ${this.name}`);
    }
  }

  async getSwitchState(): Promise<CharacteristicValue> {
    this.log.debug('Received getSwitchState() event for ' + this.name);
    const success = await this.getStatus();
    if (!success) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    const switchState = this.deviceStatus?.status?.switch?.switch?.value;
    this.log.debug(`SwitchState value from ${this.name}: ${switchState}`);
    return switchState === 'on';
  }

  async setLevel(value: CharacteristicValue): Promise<void> {
    this.log.debug('Received setLevel(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.accessory.context.device.label + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const targetLevel = Number(value);
    if (this.setLevelDebounceTimer) {
      clearTimeout(this.setLevelDebounceTimer);
    }

    this.setLevelDebounceTimer = setTimeout(async () => {
      this.setLevelDebounceTimer = undefined;
      if (this.lastSentLevel === targetLevel) {
        this.log.debug(`Level for ${this.name} already at ${targetLevel}, skipping duplicate command`);
        return;
      }

      this.log.debug(`Setting switchLevel of ${this.name} to ${targetLevel}`);
      this.lastSentLevel = targetLevel;
      const success = await this.multiServiceAccessory.sendCommand('switchLevel', 'setLevel', [targetLevel]);
      if (success) {
        this.log.debug('setLevel(' + value + ') SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
      } else {
        this.log.error(`Failed to send setLevel command for ${this.name}`);
      }
    }, 350);
  }

  async getLevel(): Promise<CharacteristicValue> {
    this.log.debug('Received getLevel() event for ' + this.name);
    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.accessory.context.device.label + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const success = await this.getStatus();
    if (!success) {
      this.log.error(`Could not get device status for ${this.name}`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const rawLevel = this.deviceStatus?.status?.switchLevel?.level?.value;
    if (rawLevel !== undefined && rawLevel !== null) {
      const level = Number(rawLevel);
      this.lastSentLevel = level;
      this.log.debug('getLevel() SUCCESSFUL for ' + this.name + '. value = ' + level);
      return level;
    }
    return 0;
  }

  public processEvent(event: ShortEvent): void {
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
