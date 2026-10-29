"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionHandler = void 0;
//import { RequestBody, ResponseBody } from '../webhook/subscriptionHandler;
const axios_1 = __importDefault(require("axios"));
const keyValues_1 = require("../keyValues");
class SubscriptionHandler {
    config;
    devices = [];
    deviceIds = [];
    log;
    shutdown = false;
    axInstance;
    constructor(platform, devices) {
        this.config = platform.config;
        this.log = platform.log;
        devices.forEach((device) => {
            this.deviceIds.push(device.id);
        });
        this.devices = devices;
        const headerDict = {
            'Authorization': 'Bearer: ' + this.config.WebhookToken,
            'Keep-Alive': 'timeout=120, max=1000',
        };
        this.axInstance = axios_1.default.create({
            baseURL: keyValues_1.WEBHOOK_URL,
            headers: headerDict,
            timeout: 90000,
        });
    }
    async startService() {
        this.log.debug('Starting subscription handler');
        const request = {
            timeout: 85000,
            deviceIds: this.deviceIds,
        };
        while (!this.shutdown) {
            this.log.debug('Posting request to web hook');
            let response;
            try {
                response = await this.axInstance.post('clientrequest', request);
                this.log.debug(`Received response from webhook ${JSON.stringify(response.data)}`);
                const responseBody = response.data;
                responseBody.events.forEach(event => {
                    const device = this.devices.find(device => device.id === event.deviceId);
                    if (device) {
                        device.processEvent(event);
                    }
                });
            }
            catch (error) {
                //this.shutdown = true;
                this.log.error(`Could not connect to web hook service: ${error}.  Will retry`);
                await (0, keyValues_1.wait)(keyValues_1.WH_CONNECT_RETRY_MINUTES * 60);
            }
        }
    }
    stopService() {
        this.shutdown = true;
    }
}
exports.SubscriptionHandler = SubscriptionHandler;
//# sourceMappingURL=subscriptionHandler.js.map