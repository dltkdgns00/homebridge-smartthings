import { PlatformAccessory } from 'homebridge';
import { IKHomeBridgeHomebridgePlatform } from '../platform';
import { MultiServiceAccessory } from '../multiServiceAccessory';
import { SensorService } from './sensorService';
import { ShortEvent } from '../webhook/subscriptionHandler';

export class TemperatureService extends SensorService {
  private unit = 'C';

  constructor(platform: IKHomeBridgeHomebridgePlatform, accessory: PlatformAccessory, componentId: string, capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {
    super(platform, accessory, componentId, capabilities, multiServiceAccessory, name, deviceStatus);

    this.log.debug(`Adding TemperatureService to ${this.name}`);

    this.initService(platform.Service.TemperatureSensor, platform.Characteristic.CurrentTemperature, (status) => {
      const tempObj = status?.temperatureMeasurement?.temperature;
      if (!tempObj || tempObj.value === null || tempObj.value === undefined || isNaN(Number(tempObj.value))) {
        this.log.debug(`${this.name} returned bad value for temperature status`);
        throw('Bad Value');
      }

      const num = Number(tempObj.value);
      if (tempObj.unit === 'F') {
        this.unit = 'F';
        return (num - 32) * (5 / 9);
      } else {
        this.unit = 'C';
        return num;
      }
    });

    // Support sub-zero temperatures (e.g., freezers down to -30°C)
    this.service.getCharacteristic(platform.Characteristic.CurrentTemperature)
      .setProps({ minValue: -50, maxValue: 100 });
  }

  public processEvent(event: ShortEvent): void {
    this.log.debug(`Event updating temperature measurement for ${this.name} to ${event.value}`);
    this.service.updateCharacteristic(
      this.platform.Characteristic.CurrentTemperature,
      this.unit === 'F' ? (event.value as number - 32) * (5/9) : event.value as number);
  }
}