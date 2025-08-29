export declare class FileManager {
    private tempDir;
    constructor();
    private ensureTempDir;
    createTempFile(content: string, extension: string): string;
    createTempDir(): string;
    deleteFile(filePath: string): void;
    deleteDirectory(dirPath: string): void;
    writeFile(filePath: string, content: string): void;
    readFile(filePath: string): string;
    fileExists(filePath: string): boolean;
    getFileName(filePath: string): string;
    getFileNameWithoutExtension(filePath: string): string;
    joinPath(...paths: string[]): string;
    cleanupOldFiles(): void;
}
export declare const fileManager: FileManager;
//# sourceMappingURL=fileManager.d.ts.map