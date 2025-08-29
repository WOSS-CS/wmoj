import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class FileManager {
  private tempDir: string;

  constructor() {
    this.tempDir = process.env.NODE_ENV === 'production' 
      ? '/tmp/code-execution' 
      : path.join(process.cwd(), 'temp');
    
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  createTempFile(content: string, extension: string): string {
    const fileName = `${uuidv4()}.${extension}`;
    const filePath = path.join(this.tempDir, fileName);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  createTempDir(): string {
    const dirName = uuidv4();
    const dirPath = path.join(this.tempDir, dirName);
    
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
  }

  deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn(`Failed to delete file ${filePath}:`, error);
    }
  }

  deleteDirectory(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.warn(`Failed to delete directory ${dirPath}:`, error);
    }
  }

  writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  getFileName(filePath: string): string {
    return path.basename(filePath);
  }

  getFileNameWithoutExtension(filePath: string): string {
    return path.basename(filePath, path.extname(filePath));
  }

  joinPath(...paths: string[]): string {
    return path.join(...paths);
  }

  // Cleanup old temp files
  cleanupOldFiles(): void {
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
          } else {
            this.deleteFile(itemPath);
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }
}

export const fileManager = new FileManager();
