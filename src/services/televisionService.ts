import { PlatformAccessory, CharacteristicValue, Service } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { BaseService } from './baseService';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { ShortEvent } from '../webhook/subscriptionHandler';
import { sanitizeName } from '../keyValues';

export class TelevisionService extends BaseService {
  private speakerService: Service;
  private currentInputId = 1;

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

    const existingSwitch = this.accessory.getService(platform.Service.Switch);
    if (existingSwitch) {
      this.accessory.removeService(existingSwitch);
    }

    this.setServiceType(platform.Service.Television);
    this.log.debug(`Adding TelevisionService to ${this.name}`);

    this.service.setCharacteristic(platform.Characteristic.ConfiguredName, sanitizeName(this.name));
    this.service.setCharacteristic(
      platform.Characteristic.SleepDiscoveryMode,
      platform.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE,
    );

    this.service.getCharacteristic(platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    this.service.getCharacteristic(platform.Characteristic.ActiveIdentifier)
      .onGet(() => this.currentInputId)
      .onSet(this.setActiveIdentifier.bind(this));

    this.service.getCharacteristic(platform.Characteristic.RemoteKey)
      .onSet(this.setRemoteKey.bind(this));

    // Setup TelevisionSpeaker service for volume and mute control
    this.speakerService = this.accessory.getService(platform.Service.TelevisionSpeaker) ||
      this.accessory.addService(platform.Service.TelevisionSpeaker, `${this.name} Speaker`, `tv-speaker-${this.componentId}`);

    this.speakerService.setCharacteristic(
      platform.Characteristic.VolumeControlType,
      platform.Characteristic.VolumeControlType.ABSOLUTE,
    );

    this.speakerService.getCharacteristic(platform.Characteristic.VolumeSelector)
      .onSet(this.setVolumeSelector.bind(this));

    if (this.hasCapability('audioVolume')) {
      this.speakerService.getCharacteristic(platform.Characteristic.Volume)
        .onGet(this.getVolume.bind(this))
        .onSet(this.setVolume.bind(this));
    }

    if (this.hasCapability('audioMute')) {
      this.speakerService.getCharacteristic(platform.Characteristic.Mute)
        .onGet(this.getMute.bind(this))
        .onSet(this.setMute.bind(this));
    }

    this.service.addLinkedService(this.speakerService);

    // 실제 삼성 TV 입력 소스 등록: TV 및 HDMI1 (OllehTV 등 셋톱박스)
    const input1 = this.accessory.getService('input-source-1') ||
      this.accessory.addService(platform.Service.InputSource, 'HDMI 1 (셋톱박스)', 'input-source-1');
    input1.setCharacteristic(platform.Characteristic.Identifier, 1)
      .setCharacteristic(platform.Characteristic.ConfiguredName, 'HDMI 1 (셋톱박스)')
      .setCharacteristic(platform.Characteristic.IsConfigured, platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(platform.Characteristic.InputSourceType, platform.Characteristic.InputSourceType.HDMI)
      .setCharacteristic(platform.Characteristic.CurrentVisibilityState, platform.Characteristic.CurrentVisibilityState.SHOWN);
    this.service.addLinkedService(input1);

    const input2 = this.accessory.getService('input-source-2') ||
      this.accessory.addService(platform.Service.InputSource, '실시간 TV', 'input-source-2');
    input2.setCharacteristic(platform.Characteristic.Identifier, 2)
      .setCharacteristic(platform.Characteristic.ConfiguredName, '실시간 TV')
      .setCharacteristic(platform.Characteristic.IsConfigured, platform.Characteristic.IsConfigured.CONFIGURED)
      .setCharacteristic(platform.Characteristic.InputSourceType, platform.Characteristic.InputSourceType.TUNER)
      .setCharacteristic(platform.Characteristic.CurrentVisibilityState, platform.Characteristic.CurrentVisibilityState.SHOWN);
    this.service.addLinkedService(input2);

    this.service.setCharacteristic(platform.Characteristic.ActiveIdentifier, 1);

    let pollSeconds = 10;
    if (this.platform.config.PollSwitchesAndLightsSeconds !== undefined) {
      pollSeconds = this.platform.config.PollSwitchesAndLightsSeconds;
    }

    if (pollSeconds > 0) {
      multiServiceAccessory.startPollingState(
        pollSeconds,
        this.getActive.bind(this),
        this.service,
        platform.Characteristic.Active,
      );
    }
  }

  private hasCapability(cap: string): boolean {
    return this.capabilities.includes(cap);
  }

  async getActive(): Promise<CharacteristicValue> {
    this.log.debug(`Received getActive() for TV ${this.name}`);
    const success = await this.getStatus();
    if (!success) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const switchState = this.deviceStatus?.status?.switch?.switch?.value;
    return switchState === 'on'
      ? this.platform.Characteristic.Active.ACTIVE
      : this.platform.Characteristic.Active.INACTIVE;
  }

  async setActive(value: CharacteristicValue): Promise<void> {
    this.log.debug(`Received setActive(${value}) for TV ${this.name}`);
    if (!this.multiServiceAccessory.isOnline()) {
      this.log.error(`${this.name} is offline`);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    const cmd = value === this.platform.Characteristic.Active.ACTIVE ? 'on' : 'off';
    const success = await this.multiServiceAccessory.sendCommand('switch', cmd);
    if (success) {
      this.multiServiceAccessory.forceNextStatusRefresh();
    } else {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async setActiveIdentifier(value: CharacteristicValue): Promise<void> {
    const id = Number(value);
    this.currentInputId = id;
    this.log.debug(`Received setActiveIdentifier(${id}) for TV ${this.name}`);

    const targetSource = id === 1 ? 'HDMI1' : 'dtv';
    // samsungvd.mediaInputSource 또는 mediaInputSource로 입력 전환 명령 전송
    const cap = this.hasCapability('samsungvd.mediaInputSource') ? 'samsungvd.mediaInputSource' : 'mediaInputSource';
    const success = await this.multiServiceAccessory.sendCommand(cap, 'setInputSource', [targetSource]);
    if (success) {
      this.multiServiceAccessory.forceNextStatusRefresh();
    }
  }

  async getVolume(): Promise<CharacteristicValue> {
    const success = await this.getStatus();
    if (!success) {
      return 0;
    }
    const vol = this.deviceStatus?.status?.audioVolume?.volume?.value;
    return typeof vol === 'number' ? vol : 0;
  }

  async setVolume(value: CharacteristicValue): Promise<void> {
    this.log.debug(`Received setVolume(${value}) for TV ${this.name}`);
    await this.multiServiceAccessory.sendCommand('audioVolume', 'setVolume', [Number(value)]);
  }

  async setVolumeSelector(value: CharacteristicValue): Promise<void> {
    const isIncrement = value === this.platform.Characteristic.VolumeSelector.INCREMENT;
    const cmd = isIncrement ? 'volumeUp' : 'volumeDown';
    this.log.debug(`Received setVolumeSelector(${cmd}) for TV ${this.name}`);
    await this.multiServiceAccessory.sendCommand('audioVolume', cmd);
  }

  async getMute(): Promise<CharacteristicValue> {
    const success = await this.getStatus();
    if (!success) {
      return false;
    }
    const muteVal = this.deviceStatus?.status?.audioMute?.mute?.value;
    return muteVal === 'muted';
  }

  async setMute(value: CharacteristicValue): Promise<void> {
    const cmd = value ? 'mute' : 'unmute';
    this.log.debug(`Received setMute(${cmd}) for TV ${this.name}`);
    await this.multiServiceAccessory.sendCommand('audioMute', cmd);
  }

  async setRemoteKey(value: CharacteristicValue): Promise<void> {
    const RemoteKey = this.platform.Characteristic.RemoteKey;
    this.log.debug(`Received RemoteKey(${value}) for TV ${this.name}`);

    switch (value) {
      case RemoteKey.SELECT:
      case RemoteKey.PLAY_PAUSE:
        if (this.hasCapability('mediaPlayback')) {
          await this.multiServiceAccessory.sendCommand('mediaPlayback', 'play');
        }
        break;
      case RemoteKey.BACK:
      case RemoteKey.EXIT:
        // 뒤로가기 키 지원
        this.log.debug(`Back key pressed for TV ${this.name}`);
        break;
      case RemoteKey.ARROW_UP:
        if (this.hasCapability('tvChannel')) {
          await this.multiServiceAccessory.sendCommand('tvChannel', 'channelUp');
        } else if (this.hasCapability('audioVolume')) {
          await this.multiServiceAccessory.sendCommand('audioVolume', 'volumeUp');
        }
        break;
      case RemoteKey.ARROW_DOWN:
        if (this.hasCapability('tvChannel')) {
          await this.multiServiceAccessory.sendCommand('tvChannel', 'channelDown');
        } else if (this.hasCapability('audioVolume')) {
          await this.multiServiceAccessory.sendCommand('audioVolume', 'volumeDown');
        }
        break;
      case RemoteKey.ARROW_LEFT:
        if (this.hasCapability('audioVolume')) {
          await this.multiServiceAccessory.sendCommand('audioVolume', 'volumeDown');
        }
        break;
      case RemoteKey.ARROW_RIGHT:
        if (this.hasCapability('audioVolume')) {
          await this.multiServiceAccessory.sendCommand('audioVolume', 'volumeUp');
        }
        break;
      default:
        this.log.debug(`Unhandled RemoteKey ${value} for TV ${this.name}`);
        break;
    }
  }

  public processEvent(event: ShortEvent): void {
    if (event.capability === 'switch') {
      const active = event.value === 'on'
        ? this.platform.Characteristic.Active.ACTIVE
        : this.platform.Characteristic.Active.INACTIVE;
      this.service.updateCharacteristic(this.platform.Characteristic.Active, active);
    } else if (event.capability === 'audioVolume' && event.attribute === 'volume') {
      this.speakerService.updateCharacteristic(this.platform.Characteristic.Volume, Number(event.value));
    } else if (event.capability === 'audioMute' && event.attribute === 'mute') {
      this.speakerService.updateCharacteristic(this.platform.Characteristic.Mute, event.value === 'muted');
    }
  }
}
