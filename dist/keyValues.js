"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WH_CONNECT_RETRY_MINUTES = exports.WEBHOOK_URL = void 0;
exports.wait = wait;
exports.sanitizeName = sanitizeName;
exports.WEBHOOK_URL = process.env.WEBHOOK_URL ? process.env.WEBHOOK_URL : 'https://stwh.kleinstudios.net/api/';
exports.WH_CONNECT_RETRY_MINUTES = 1;
async function wait(seconds) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), seconds * 1000);
    });
}
function sanitizeName(name) {
    if (!name) {
        return 'Accessory';
    }
    // e.g. "[에어컨5] 에어컨" -> "에어컨5 에어컨"
    let cleaned = name.replace(/^\[(.*?)\]\s*/, '$1 ').trim();
    // Remove any remaining bracket characters
    cleaned = cleaned.replace(/[[\]]/g, '').trim();
    // Ensure start and end are alphanumeric/Korean
    cleaned = cleaned.replace(/^[^a-zA-Z0-9가-힣]+/, '').replace(/[^a-zA-Z0-9가-힣]+$/, '').trim();
    return cleaned || name;
}
//# sourceMappingURL=keyValues.js.map