import { PlatformAccessory, CharacteristicValue } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class ValveService extends BaseService {

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.setServiceType(platform.Service.Valve);
    this.log.debug(`Adding ValveService to ${this.name}`);

    this.service.getCharacteristic(platform.Characteristic.Active)
      .onGet(this.getValveState.bind(this))
      .onSet(this.setValveState.bind(this));

    this.service.getCharacteristic(platform.Characteristic.ValveType)
      .onGet(() => platform.Characteristic.ValveType.GENERIC_VALVE);

    this.service.getCharacteristic(platform.Characteristic.InUse)
      .onGet(this.getValveInUse.bind(this));

    let pollSeconds = 10;
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSeconds > 0) {
      multiServiceAccessory.startPollingState(
        pollSeconds,
        this.getValveState.bind(this),
        this.service,
        platform.Characteristic.Active,
        platform.Characteristic.InUse,
        this.getValveInUse.bind(this),
      );
    }
  }

  async getValveState(): Promise<CharacteristicValue> {
    const success = await this.getStatus();
    if (!success) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    const valveState = this.deviceStatus?.status?.valve?.valve?.value;
    this.log.debug(`Received valve value of ${valveState} from Smartthings`);
    return valveState === 'open'
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE;
  }

  async getValveInUse(): Promise<CharacteristicValue> {
    const success = await this.getStatus();
    if (!success) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
    const valveState = this.deviceStatus?.status?.valve?.valve?.value;
    return valveState === 'open'
      ? this.platform.Characteristic.InUse.IN_USE
      : this.platform.Characteristic.InUse.NOT_IN_USE;
  }

  async setValveState(value: CharacteristicValue) {
    this.log.debug('Received setValveState(' + value + ') event for ' + this.name);

    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(this.name + ' is offline');
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const isOpen = value === this.platform.Characteristic.Active.ACTIVE;

    // 가스 안전 법규 및 사고 예방: 가스차단기는 원격 잠금(close)만 허용하고 원격 열기(open)는 차단
    if (isOpen && (this.name.includes('가스') || this.name.toLowerCase().includes('gas'))) {
      this.log.warn(`[안전 방어] ${this.name}: 가스 밸브 원격 열기는 안전 법규 및 사고 방지를 위해 차단되었습니다. 수동으로 밸브를 열어주세요.`);
      // 홈 앱 UI 상태를 즉시 '잠김(INACTIVE)'으로 되돌림
      setTimeout(() => {
        this.service.updateCharacteristic(this.platform.Characteristic.Active, this.platform.Characteristic.Active.INACTIVE);
        this.service.updateCharacteristic(this.platform.Characteristic.InUse, this.platform.Characteristic.InUse.NOT_IN_USE);
      }, 500);
      return;
    }

    const command = isOpen ? 'open' : 'close';
    const success = await this.multiServiceAccessory.sendCommand('valve', command);
    if (success) {
      this.log.debug('onSet(' + value + ') SUCCESSFUL for ' + this.name);
      this.service.updateCharacteristic(
        this.platform.Characteristic.InUse,
        isOpen ? this.platform.Characteristic.InUse.IN_USE : this.platform.Characteristic.InUse.NOT_IN_USE,
      );
      this.multiServiceAccessory.forceNextStatusRefresh();
    } else {
      this.log.error(`Command failed for ${this.name}`);
    }
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating valve capability for ${this.name} to ${event.value}`);
    const isOpen = event.value === 'open';
    this.service.updateCharacteristic(
      this.platform.Characteristic.Active,
      isOpen ? this.platform.Characteristic.Active.ACTIVE : this.platform.Characteristic.Active.INACTIVE,
    );
    this.service.updateCharacteristic(
      this.platform.Characteristic.InUse,
      isOpen ? this.platform.Characteristic.InUse.IN_USE : this.platform.Characteristic.InUse.NOT_IN_USE,
    );
  }
}
