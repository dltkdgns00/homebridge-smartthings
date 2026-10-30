import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class ThermostatService extends BaseService {
  targetHeatingCoolingState: any;
  targetTemperature = 20;
  units = 'C';
  supportsOperatingState = false;
  supportsCooling = false;
  supportsHeating = false;
  private targetTempDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
    componentId: string,
    capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string,
    deviceStatus,
  ) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    // 이전 단일 서비스로 등록되었던 잔재 서비스(스위치, 온도센서 등) 정리
    const existingSwitch = this.accessory.getService(platform.Service.Switch);
    if (existingSwitch) {
      this.accessory.removeService(existingSwitch);
    }
    const existingTemp = this.accessory.getService(platform.Service.TemperatureSensor);
    if (existingTemp) {
      this.accessory.removeService(existingTemp);
    }

    this.setServiceType(platform.Service.Thermostat);
    this.log.debug(`Adding ThermostatService to ${this.name} with capabilities: ${capabilities.join(', ')}`);

    const component = this.multiServiceAccessory.components.find((c) => c.componentId === componentId);
    if (component && component.capabilities.find((cap) => cap === 'thermostatOperatingState')) {
      this.supportsOperatingState = true;
    }
    this.supportsCooling = this.capabilities.includes('thermostatCoolingSetpoint');
    this.supportsHeating = this.capabilities.includes('thermostatHeatingSetpoint');

    const TargetState = platform.Characteristic.TargetHeatingCoolingState;
    const CurrentState = platform.Characteristic.CurrentHeatingCoolingState;

    this.service.getCharacteristic(CurrentState)
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    const targetStateChar = this.service.getCharacteristic(TargetState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    // 기기 능력에 따라 유효 모드 설정 (냉방 전용 / 난방 전용 / 복합)
    if (this.supportsCooling && !this.supportsHeating) {
      targetStateChar.setProps({
        validValues: [
          TargetState.OFF,
          TargetState.COOL,
        ],
      });
      this.targetHeatingCoolingState = TargetState.OFF;
    } else if (this.supportsHeating && !this.supportsCooling) {
      targetStateChar.setProps({
        validValues: [
          TargetState.OFF,
          TargetState.HEAT,
        ],
      });
      this.targetHeatingCoolingState = TargetState.OFF;
    } else {
      targetStateChar.setProps({
        validValues: [
          TargetState.OFF,
          TargetState.HEAT,
          TargetState.COOL,
          TargetState.AUTO,
        ],
      });
      this.targetHeatingCoolingState = TargetState.OFF;
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

    this.targetTemperature = 20;

    let pollSensors = 10;
    if (this.platform.config.PollSensorsSeconds !== undefined) {
      pollSensors = this.platform.config.PollSensorsSeconds;
    }

    if (pollSensors > 0) {
      multiServiceAccessory.startPollingState(
        pollSensors,
        this.getCurrentHeatingCoolingState.bind(this),
        this.service,
        CurrentState,
        TargetState,
        this.getTargetHeatingCoolingState.bind(this),
      );

      multiServiceAccessory.startPollingState(
        pollSensors,
        this.getCurrentTemperature.bind(this),
        this.service,
        platform.Characteristic.CurrentTemperature,
        platform.Characteristic.TargetTemperature,
        this.getTargetTemperature.bind(this),
      );
    }
  }

  private hasCapability(cap: string): boolean {
    return this.capabilities.includes(cap);
  }

  // TARGET STATE CALLBACKS
  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
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
          this.targetHeatingCoolingState = TargetState.COOL;
          break;
        case 'heat':
        case 'emergency heat':
        case 'on':
        case 'eco':
          this.targetHeatingCoolingState = TargetState.HEAT;
          break;
        case 'auto':
          this.targetHeatingCoolingState = this.supportsCooling && !this.supportsHeating ? TargetState.COOL : TargetState.HEAT;
          break;
        default:
          this.targetHeatingCoolingState = TargetState.OFF;
          break;
      }
      return this.targetHeatingCoolingState;
    }

    if (this.hasCapability('switch')) {
      const sw = status.switch?.switch?.value;
      if (sw === 'on') {
        this.targetHeatingCoolingState = this.supportsCooling && !this.supportsHeating ? TargetState.COOL : TargetState.HEAT;
      } else {
        this.targetHeatingCoolingState = TargetState.OFF;
      }
      return this.targetHeatingCoolingState;
    }

    return this.targetHeatingCoolingState;
  }

  // Set the target state of the thermostat
  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    this.log.debug('Received setTargetHeatingCoolingState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
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

      // 표준 setThermostatMode 명령 먼저 시도, 실패 시 직접 명령 fallback
      let success = await this.multiServiceAccessory.sendCommand('thermostatMode', 'setThermostatMode', [cmd]);
      if (!success) {
        success = await this.multiServiceAccessory.sendCommand('thermostatMode', cmd);
      }

      if (success) {
        this.log.debug('setTargetHeatingCoolingState(' + value + ') SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
      } else {
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
  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    this.log.debug('Received getCurrentHeatingCoolingState() event for ' + this.name);
    const CurrentState = this.platform.Characteristic.CurrentHeatingCoolingState;

    const success = await this.getStatus();
    if (!success) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
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
        case 'on':
        case 'eco':
          return CurrentState.HEAT;
        case 'auto':
          return this.supportsCooling && !this.supportsHeating ? CurrentState.COOL : CurrentState.HEAT;
        default:
          return CurrentState.OFF;
      }
    }

    if (this.hasCapability('switch')) {
      const sw = status.switch?.switch?.value;
      if (sw === 'on') {
        return this.supportsCooling && !this.supportsHeating ? CurrentState.COOL : CurrentState.HEAT;
      }
      return CurrentState.OFF;
    }

    if (this.supportsOperatingState) {
      const opState = status.thermostatOperatingState?.thermostatOperatingState?.value;
      if (opState === 'heating') {
        return CurrentState.HEAT;
      } else if (opState === 'cooling') {
        return CurrentState.COOL;
      }
    }

    return CurrentState.OFF;
  }

  // CURRENT TEMP
  async getCurrentTemperature(): Promise<CharacteristicValue> {
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
  async getTargetTemperature(): Promise<CharacteristicValue> {
    this.log.debug('Received GetTargetTemperature for ' + this.name);
    const success = await this.getStatus();
    if (!success || !this.deviceStatus?.status) {
      return this.targetTemperature;
    }

    const TargetState = this.platform.Characteristic.TargetHeatingCoolingState;
    const targetMode = await this.getTargetHeatingCoolingState();

    let temp: number | undefined;
    if (this.supportsCooling && (!this.supportsHeating || targetMode === TargetState.COOL)) {
      temp = this.deviceStatus.status.thermostatCoolingSetpoint?.coolingSetpoint?.value;
    } else {
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

  async setTargetTemperature(value: CharacteristicValue) {
    this.log.debug('Received setTargetTemperature(' + value + ') event for ' + this.name);
    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    this.targetTemperature = Number(value);

    // 슬라이더 조작 시 350ms 디바운스 적용 (연속 API 호출 및 429 방지)
    if (this.targetTempDebounceTimer) {
      clearTimeout(this.targetTempDebounceTimer);
    }

    this.targetTempDebounceTimer = setTimeout(async () => {
      this.targetTempDebounceTimer = null;
      if (!this.multiServiceAccessory.isOnline()) {
        return;
      }

      let capability = 'thermostatHeatingSetpoint';
      let command = 'setHeatingSetpoint';

      if (this.supportsCooling && (!this.supportsHeating || this.targetHeatingCoolingState === this.platform.Characteristic.TargetHeatingCoolingState.COOL)) {
        capability = 'thermostatCoolingSetpoint';
        command = 'setCoolingSetpoint';
      }

      // 한국형 아파트 월패드 및 에어컨은 정수(1도 단위)로 전달하는 것이 가장 안전
      const rounded = Math.round(this.targetTemperature);
      const convertedTemp = this.units === 'F' ? Math.round((rounded * (9 / 5)) + 32) : rounded;

      this.log.debug(`Sending ${command}(${convertedTemp}) for ${this.name}`);
      await this.multiServiceAccessory.sendCommand(capability, command, [convertedTemp]);
    }, 350);
  }

  // DISPLAY UNITS
  getTemperatureDisplayUnits(): CharacteristicValue {
    this.log.debug('Received getTemperatureDislayUnits for ' + this.name);
    if (this.units === 'C') {
      return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
    } else {
      return this.platform.Characteristic.TemperatureDisplayUnits.FAHRENHEIT;
    }
  }

  setTemperatureDisplayUnits(value: CharacteristicValue) {
    this.log.debug(`Received request to set display units to ${value}. No equivalent in Smartthings...`);
    return;
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Updating ${event.attribute} for ${this.name} from event to ${event.value}`);
    let characteristic = this.platform.Characteristic.TargetTemperature;
    let value: CharacteristicValue;

    if (event.attribute === 'heatingSetpoint' || event.attribute === 'coolingSetpoint') {
      const raw = this.units === 'F' ? (event.value - 32) * (5 / 9) : Number(event.value);
      value = Math.min(Math.max(raw, 5), 40);
    } else {
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
