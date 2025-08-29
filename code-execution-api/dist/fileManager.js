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
exports.fileManager = exports.FileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class FileManager {
    constructor() {
        this.tempDir = process.env.NODE_ENV === 'production'
            ? '/tmp/code-execution'
            : path.join(process.cwd(), 'temp');
        this.ensureTempDir();
    }
    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }
    createTempFile(content, extension) {
        const fileName = `${(0, uuid_1.v4)()}.${extension}`;
        const filePath = path.join(this.tempDir, fileName);
        fs.writeFileSync(filePath, content, 'utf-8');
        return filePath;
    }
    createTempDir() {
        const dirName = (0, uuid_1.v4)();
        const dirPath = path.join(this.tempDir, dirName);
        fs.mkdirSync(dirPath, { recursive: true });
        return dirPath;
    }
    deleteFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        catch (error) {
            console.warn(`Failed to delete file ${filePath}:`, error);
        }
    }
    deleteDirectory(dirPath) {
        try {
            if (fs.existsSync(dirPath)) {
                fs.rmSync(dirPath, { recursive: true, force: true });
            }
        }
        catch (error) {
            console.warn(`Failed to delete directory ${dirPath}:`, error);
        }
    }
    writeFile(filePath, content) {
        fs.writeFileSync(filePath, content, 'utf-8');
    }
    readFile(filePath) {
        return fs.readFileSync(filePath, 'utf-8');
    }
    fileExists(filePath) {
        return fs.existsSync(filePath);
    }
    getFileName(filePath) {
        return path.basename(filePath);
    }
    getFileNameWithoutExtension(filePath) {
        return path.basename(filePath, path.extname(filePath));
    }
    joinPath(...paths) {
        return path.join(...paths);
    }
    cleanupOldFiles() {
        try {
            const maxAge = parseInt(process.env.MAX_TEMP_FILE_AGE_MINUTES || '10') * 60 * 1000;
            const now = Date.now();
            const items = fs.readdirSync(this.tempDir);
            for (const item of items) {
                const itemPath = path.join(this.tempDir, item);
                const stats = fs.statSync(itemPath);
                if (now - stats.mtime.getTime() > maxAge) {
                    if (stats.isDirectory()) {
                        this.deleteDirectory(itemPath);
                    }
                    else {
                        this.deleteFile(itemPath);
                    }
                }
            }
        }
        catch (error) {
            console.warn('Cleanup failed:', error);
        }
    }
}
exports.FileManager = FileManager;
exports.fileManager = new FileManager();
//# sourceMappingURL=fileManager.js.map