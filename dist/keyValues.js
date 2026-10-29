"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WH_CONNECT_RETRY_MINUTES = exports.WEBHOOK_URL = void 0;
exports.wait = wait;
exports.WEBHOOK_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL : 'https://stwh.kleinstudios.net/api/';
exports.WH_CONNECT_RETRY_MINUTES = 1;
async function wait(seconds) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), seconds * 1000);
    });
}
//# sourceMappingURL=keyValues.js.map