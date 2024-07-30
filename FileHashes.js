const fs = require('fs');
const path = require('path');
const crypto = require('crypto');


class FileHasher {
    /**
     * Конструктор класу FileHasher.
     * @param {string} algorithm - Алгоритм хешування (за замовчуванням 'sha256').
     * @param {boolean} enableLogging - Чи ввімкнути логування (за замовчуванням false).
     * @param {object} logger - Логгер для виведення повідомлень (за замовчуванням console).
     */
    constructor(algorithm = 'sha256', enableLogging = false, logger = console) {
        this.algorithm = algorithm;
        this.enableLogging = enableLogging;
        this.logger = logger;
        this.fileCache = new Map();
        this.dirCache = new Map();
    }

    /**
     * Логування повідомлень, якщо увімкнене.
     * @param {string} message - Повідомлення для логування.
     */
    log(message) {
        if (this.enableLogging) {
            this.logger.log(`${message}`);
        }
    }
    
    /**
     * Асинхронне хешування файлу.
     * @param {string} filePath - Шлях до файлу.
     * @returns {Promise<string>} - Хеш файлу.
     */
    async hashFile(filePath) {
        this.log(`Hashing file: ${filePath}`);

        try {
            const cacheEntry = this.fileCache.get(filePath);
            if (cacheEntry) {
                const { hash, mtime, size } = cacheEntry;
                const stat = await fs.promises.stat(filePath);
                if (stat.mtimeMs === mtime && stat.size === size) {
                    this.log(`Cache hit for file: ${filePath}`);
                    return hash;
                }
            }

            return new Promise((resolve, reject) => {
                const hash = crypto.createHash(this.algorithm);
                const input = fs.createReadStream(filePath);

                input.on('data', chunk => hash.update(chunk));
                input.on('end', async () => {
                    const fileHash = hash.digest('hex');
                    const stat = await fs.promises.stat(filePath);
                    this.fileCache.set(filePath, { hash: fileHash, mtime: stat.mtimeMs, size: stat.size });
                    resolve(fileHash);
                });
                input.on('error', reject);
            });
        } catch (error) {
            this.log(`Error hashing file: ${error.message}`);
            throw error;
        }
    }

    /**
     * Асинхронне хешування всіх файлів у директорії.
     * @param {string} dirPath - Шлях до директорії.
     * @returns {Promise<Array>} - Масив об'єктів з інформацією про файли.
     */
    async hashFilesInDirectory(dirPath) {
        this.log(`Hashing files in directory: ${dirPath}`);

        try {
            const files = await fs.promises.readdir(dirPath);
            const fileInfos = await Promise.all(files.map(async (file) => {
                const filePath = path.join(dirPath, file);
                const stat = await fs.promises.stat(filePath);
                if (stat.isFile()) {
                    const fileHash = await this.hashFile(filePath);
                    return {
                        type: 'file',
                        name: file,
                        hash: fileHash,
                        path: path.relative(process.cwd(), filePath) // Відносний шлях
                    };
                }
            }));

            return fileInfos.filter(info => info); // Remove undefined entries
        } catch (error) {
            this.log(`Error hashing files in directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Хешування директорії на основі її вмісту.
     * @param {string} dirPath - Шлях до директорії.
     * @param {boolean} includeDirectories - Включати чи ні хеші для піддиректорій. (за замовчуванням false)
     * @returns {Promise<Object>} - Об'єкт з хешем директорії та інформацією про її вміст.
     */
    async hashDirectory(dirPath, includeDirectories = false) {
        this.log(`Hashing directory: ${dirPath}`);

        try {
            const cacheEntry = this.dirCache.get(dirPath);
            if (cacheEntry) {
                const { hash, mtime } = cacheEntry;
                const stat = await fs.promises.stat(dirPath);
                if (stat.mtimeMs === mtime) {
                    this.log(`Cache hit for directory: ${dirPath}`);
                    return { hash, contents: cacheEntry.contents };
                }
            }

            const fileInfos = await this.hashFilesInDirectory(dirPath);
            const hash = crypto.createHash(this.algorithm);
            fileInfos.sort((a, b) => a.path.localeCompare(b.path));
            fileInfos.forEach(info => hash.update(info.hash));

            if (includeDirectories) {
                // Include subdirectories
                const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    if (entry.isDirectory()) {
                        const dirHash = await this.hashDirectory(fullPath, includeDirectories);
                        fileInfos.push({
                            type: 'directory',
                            name: entry.name,
                            hash: dirHash.hash,
                            path: path.relative(process.cwd(), fullPath)
                        });
                        hash.update(dirHash.hash);
                    }
                }
            }

            const dirHash = hash.digest('hex');
            const stat = await fs.promises.stat(dirPath);
            this.dirCache.set(dirPath, { hash: dirHash, mtime: stat.mtimeMs, contents: fileInfos });

            return {
                hash: dirHash,
                contents: fileInfos
            };
        } catch (error) {
            this.log(`Error hashing directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Асинхронне рекурсивне читання директорії з можливістю включення хешів для піддиректорій.
     * @param {string} currentPath - Поточний шлях директорії.
     * @param {string} relativePath - Відносний шлях директорії. (за замовчуванням "")
     * @param {boolean} includeDirectories - Включати чи ні хеші для директорій. (за замовчуванням false)
     * @returns {Promise<Array>} - Масив об'єктів з інформацією про файли та директорії.
     */
    async readDirectory(currentPath, relativePath = '', includeDirectories = false) {
        try {
            const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
            const results = [];

            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                const relativeFullPath = path.join(relativePath, entry.name);

                if (entry.isFile()) {
                    const fileHash = await this.hashFile(fullPath);
                    results.push({
                        type: 'file',
                        name: entry.name,
                        hash: fileHash,
                        path: relativeFullPath
                    });
                } else if (entry.isDirectory()) {
                    if (includeDirectories) {
                        const dirHash = await this.hashDirectory(fullPath, includeDirectories);

                        results.push({
                            type: 'directory',
                            name: entry.name,
                            hash: dirHash.hash,
                            path: relativeFullPath
                        });
                    }

                    const subEntries = await this.readDirectory(fullPath, relativeFullPath, includeDirectories);
                    results.push(...subEntries);
                }
            }

            return results;
        } catch (error) {
            this.log(`Error reading directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Асинхронне рекурсивне хешування директорії з опцією включення хешів для піддиректорій.
     * @param {string} dirPath - Шлях до директорії.
     * @param {boolean} includeDirectories - Включати чи ні хеші для піддиректорій. (за замовчуванням false)
     * @returns {Promise<Array>} - Масив об'єктів з інформацією про файли та директорії.
     */
    async hashDirectoryRecursively(dirPath, includeDirectories = false) {
        this.log(`Hashing directory recursively: ${dirPath}`);
        try {
            return await this.readDirectory(dirPath, '', includeDirectories);
        } catch (error) {
            this.log(`Error hashing directory recursively: ${error.message}`);
            throw error;
        }
    }
}



// Тестування класу FileHasher
(async () => {
    const hasher = new FileHasher('sha256', false, console);

    try {
        const fileHash = await hasher.hashFile('D:\\Users\\MuliarAV\\Desktop\\test_hash\\pictures\\test2.jpg');
        console.log('File hash:', fileHash);

        const folderInfos = await hasher.hashFilesInDirectory('D:\\Users\\MuliarAV\\Desktop\\test_hash\\pictures');
        console.log('Folder file infos:', folderInfos);

        const directoryInfoWithHashes = await hasher.hashDirectory('D:\\Users\\MuliarAV\\Desktop\\test_hash\\pictures', true);
        console.log('Directory hash and contents with directory hashes:', directoryInfoWithHashes);

        const directoryInfoWithoutHashes = await hasher.hashDirectory('D:\\Users\\MuliarAV\\Desktop\\test_hash', false);
        console.log('Directory hash and contents without directory hashes:', directoryInfoWithoutHashes);

        const recursiveInfos = await hasher.hashDirectoryRecursively('D:\\Users\\MuliarAV\\Desktop\\test_hash', true);
        console.log('Recursive folder infos with directory hashes:', recursiveInfos);

        const recursiveInfosNoDirHash = await hasher.hashDirectoryRecursively('D:\\Users\\MuliarAV\\Desktop\\test_hash', false);
        console.log('Recursive folder infos without directory hashes:', recursiveInfosNoDirHash);


    } catch (error) {
        console.error('Error:', error.message);
    }
})

// Запуск тестів
// ()



module.exports = FileHasher

