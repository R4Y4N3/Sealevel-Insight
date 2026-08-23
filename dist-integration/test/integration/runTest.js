"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const test_electron_1 = require("@vscode/test-electron");
async function main() {
    const repositoryRoot = path.resolve(__dirname, '../../..');
    const extensionDevelopmentPath = (0, node_fs_1.mkdtempSync)(path.join((0, node_os_1.tmpdir)(), 'sealevel-insight-vsix-'));
    (0, node_child_process_1.execFileSync)('unzip', ['-q', path.join(repositoryRoot, 'sealevel-insight-0.5.0.vsix'), '-d', extensionDevelopmentPath]);
    const extensionPath = path.join(extensionDevelopmentPath, 'extension');
    const fixture = path.resolve(repositoryRoot, 'test/fixtures/custom-basic');
    await (0, test_electron_1.runTests)({ extensionDevelopmentPath: extensionPath, launchArgs: [fixture], extensionTestsPath: path.resolve(__dirname, './runner') });
}
main().catch(error => { console.error(error); process.exit(1); });
//# sourceMappingURL=runTest.js.map