"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
class Command {
    capability;
    command;
    arguments;
    constructor(capability, command, args) {
        this.capability = capability;
        this.command = command;
        this.arguments = args;
    }
}
exports.Command = Command;
//# sourceMappingURL=smartThingsCommand.js.map