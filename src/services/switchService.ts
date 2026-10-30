import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class SwitchService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    // 한국 아파트 네이밍 규칙에 맞춰 조명 / 콘센트(대기전력) / 일반 스위치 카테고리 자동 분류
    const lowerName = (this.name || '').toLowerCase();
    if (lowerName.includes('조명') || lowerName.includes('light')) {
      const oldSwitch = this.accessory.getService(platform.Service.Switch);
      if (oldSwitch) {
        this.accessory.removeService(oldSwitch);
      }
      const oldOutlet = this.accessory.getService(platform.Service.Outlet);
      if (oldOutlet) {
        this.accessory.removeService(oldOutlet);
      }
      this.setServiceType(platform.Service.Lightbulb);
      this.log.debug(`Adding Lightbulb (SwitchService) to ${this.name}`);
    } else if (lowerName.includes('대기전력') || lowerName.includes('콘센트') || lowerName.includes('플러그') || lowerName.includes('outlet')) {
      const oldSwitch = this.accessory.getService(platform.Service.Switch);
      if (oldSwitch) {
        this.accessory.removeService(oldSwitch);
      }
      const oldLight = this.accessory.getService(platform.Service.Lightbulb);
      if (oldLight) {
        this.accessory.removeService(oldLight);
      }
      this.setServiceType(platform.Service.Outlet);
      this.log.debug(`Adding Outlet (SwitchService) to ${this.name}`);
    } else {
      this.setServiceType(platform.Service.Switch);
      this.log.debug(`Adding SwitchService to ${this.name}`);
    }

    this.service.getCharacteristic(platform.Characteristic.On)
      .onGet(this.getSwitchState.bind(this))
      .onSet(this.setSwitchState.bind(this));

    let pollSwitchesAndLightsSeconds = 10; // default to 10 seconds
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSwitchesAndLightsSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSwitchesAndLightsSeconds > 0) {
      multiServiceAccessory.startPollingState(pollSwitchesAndLightsSeconds, this.getSwitchState.bind(this), this.service,
        platform.Characteristic.On);
    }
  }

  async setSwitchState(value: CharacteristicValue) {
    this.log.debug('Received setSwitchState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    // [안전 방어] '일괄소등' / '일괄스위치'는 집안 전체 소등 위험이 있으므로 홈 앱 실수 켜짐(on) 오작동 방지
    const isMasterSwitch = this.name.includes('일괄스위치') || this.name.includes('일괄소등');
    if (isMasterSwitch) {
      this.log.warn(`[일괄 스위치 작동] ${this.name}: 집안 전체 일괄 제어 명령 (${value ? 'ON' : 'OFF'}) 전송`);
    }

    this.multiServiceAccessory.sendCommand('switch', value ? 'on' : 'off').then((success) => {
      if (success) {
        this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
        this.multiServiceAccessory.forceNextStatusRefresh();
      } else {
        this.log.error(`Command failed for ${this.name}`);
      }
    });
  }

  async getSwitchState(): Promise<CharacteristicValue> {
    this.log.debug('Received getSwitchState() event for ' + this.name);

    const success = await this.getStatus();
    if (!success) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const switchState = this.deviceStatus?.status?.switch?.switch?.value;
    this.log.debug(`Switch value from ${this.name}: ${switchState}`);
    return switchState === 'on';
  }

  public processEvent(event: ShortEvent): void {
    if (event.capability === 'switch') {
      this.log.debug(`Event updating switch capability for ${this.name} to ${event.value}`);
      this.service.updateCharacteristic(this.platform.Characteristic.On, event.value === 'on');
    }
  }
}
