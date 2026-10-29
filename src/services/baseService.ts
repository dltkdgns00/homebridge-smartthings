import { PlatformAccessory, Logger, Service, WithUUID } from 'homebridge';
import { ShortEvent } from '../webhook/subscriptionHandler';
import { MultiServiceAccessory } from '../multiServiceAccessory';
//import { BasePlatformAccessory } from '../basePlatformAccessory';
import { IKHomeBridgeHomebridgePlatform } from '../platform';

export class BaseService {
  protected accessory: PlatformAccessory;
  protected log: Logger;
  protected platform: IKHomeBridgeHomebridgePlatform;
  protected name = '';
  protected deviceStatus;
  protected multiServiceAccessory: MultiServiceAccessory;
  protected service: Service;
  public componentId: string;
  public capabilities: string[];

  constructor(platform: IKHomeBridgeHomebridgePlatform,
    accessory: PlatformAccessory,
    componentId: string,
    capabilities: string[],
    multiServiceAccessory: MultiServiceAccessory,
    name: string, deviceStatus) {

    this.capabilities = capabilities;
    this.accessory = accessory;
    // this.service = this.accessory.getService(platform.Service.MotionSensor) || this.accessory.addService(platform.Service.MotionSensor);
    this.platform = platform;
    this.log = platform.log;
    this.multiServiceAccessory = multiServiceAccessory;
    this.name = name;
    this.deviceStatus = deviceStatus;
    this.service = new platform.Service.Switch;  // Placeholder
    this.componentId = componentId;
  }

  protected findCapability(capabilityToFind: string): boolean {
    let component = this.accessory.context.device.components.find(c => c.id === this.componentId);
    if (component === undefined) {
      component = this.accessory.context.device.components.find(c => c.id === 'main');
    }
    if (component === undefined) {
      component = this.accessory.context.device.components[0];
    }

    return Boolean(component?.capabilities?.find(c => c.id === capabilityToFind));
  }

  protected setServiceType(serviceType: WithUUID<typeof Service>) {
    if (this.componentId === 'main') {
      this.service = this.accessory.getService(serviceType) ||
        this.accessory.addService(serviceType as unknown as Service);
    } else {
      this.log.debug(`Adding service to alternate component: ${this.componentId}`);
      this.service = this.accessory.getService(`${serviceType.name}-${this.componentId}`) ||
        this.accessory.addService(serviceType, `${serviceType.name}-${this.componentId}`, `${serviceType.name}-${this.componentId}`);
    }

    this.service.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.label);
  }

  protected async getStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.multiServiceAccessory.isOnline()) {
        this.log.debug(`${this.name} is offline`);
        resolve(false);
        return;
      }
      this.multiServiceAccessory.refreshStatus()
        .then(success => {
          resolve(Boolean(success));
        });
    });
  }

  public processEvent(event: ShortEvent) {
    this.log.debug(`${this.name} Received event with value ${event.value} - not implemented yet`);
  }
}