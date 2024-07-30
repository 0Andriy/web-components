const fs = require('fs');
const { promises: fsPromises, createReadStream, createWriteStream } = fs;
const path = require('path');
const archiver = require('archiver');
const unzipper = require('unzipper');

/**
 * Клас для роботи з файловою системою.
 * Містить методи для роботи з файлами та директоріями, включаючи асинхронні та синхронні версії методів.
 */
class FileSystem {
  /**
   * Створює екземпляр класу FileSystem з базовим шляхом.
   * @param {string} basePath - Основний шлях для всіх операцій з файлами.
   * @param {boolean} enableLogging - Увімкнення або вимкнення логування.
   */
  constructor(basePath, enableLogging = false) {
    this.basePath = basePath;
    this.memoryStorage = new Map(); // Сховище для тимчасових даних в пам'яті
    this.maxMemorySize = 1024 * 1024 * 100; // Максимальний розмір кешу в байтах (100MB)
    this.enableLogging = enableLogging;
  }

  /**
   * Логування повідомлень, якщо увімкнено.
   * @param {string} message - Повідомлення для логування.
   */
  log(message) {
    if (this.enableLogging) {
      console.log(message);
    }
  }

  /**
   * Перевіряє, чи існує директорія, і створює її, якщо не існує (асинхронний варіант).
   * @param {string} dirPath - Відносний шлях до директорії.
   * @returns {Promise<void>}
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fsPromises.mkdir(dirPath, { recursive: true });
      this.log(`Directory ensured: ${dirPath}`);
    } catch (error) {
      console.error(`Error ensuring directory exists ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Перевіряє, чи існує директорія, і створює її, якщо не існує (синхронний варіант).
   * @param {string} dirPath - Відносний шлях до директорії.
   */
  ensureDirectoryExistsSync(dirPath) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      this.log(`Directory ensured: ${dirPath}`);
    } catch (error) {
      console.error(`Error ensuring directory exists ${dirPath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Перевіряє, чи файл заблокований або недоступний для запису (асинхронний варіант).
   * @param {string} filePath - Відносний шлях до файлу.
   * @returns {Promise<boolean>}
   */
  async isFileLocked(filePath) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await fsPromises.access(fullPath, fs.constants.W_OK);
      this.log(`File is not locked: ${filePath}`);
      return false; // Файл не заблокований
    } catch (error) {
      if (error.code === 'EACCES') {
        this.log(`File is locked: ${filePath}`);
        return true; // Файл заблокований або недоступний
      }
      throw error; // Перевидаємо помилку, якщо це не помилка дозволу
    }
  }

  /**
   * Додає дані до файлу без перезапису (асинхронний варіант).
   * @param {string} filePath - Відносний шлях до файлу.
   * @param {string | Buffer} data - Дані для додавання.
   * @param {string} [encoding='utf8'] - Кодування файлу.
   */
  async appendFile(filePath, data, encoding = 'utf8') {
    try {
      const fullPath = path.join(this.basePath, filePath);
      await this.ensureDirectoryExists(path.dirname(filePath));
      await fsPromises.appendFile(fullPath, data, encoding);
      this.log(`Appended to file: ${filePath}`);
    } catch (error) {
      console.error(`Error appending to file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Створює потік для читання файлу.
   * @param {string} filePath - Відносний шлях до файлу.
   * @param {object} [options] - Опції для створення потоку.
   * @returns {Readable}
   */
  createReadStream(filePath, options) {
    try {
      const fullPath = path.join(this.basePath, filePath);
      this.log(`Creating read stream for file: ${filePath}`);
      return createReadStream(fullPath, options);
    } catch (error) {
      console.error(`Error creating read stream for file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Створює потік для запису файлу.
   * @param {string} filePath - Відносний шлях до файлу.
   * @param {object} [options] - Опції для створення потоку.
   * @returns {Writable}
   */
  createWriteStream(filePath, options) {
    try {
      const dirPath = path.dirname(filePath);
      this.ensureDirectoryExistsSync(dirPath);
      const fullPath = path.join(this.basePath, filePath);
      this.log(`Creating write stream for file: ${filePath}`);
      return createWriteStream(fullPath, options);
    } catch (error) {
      console.error(`Error creating write stream for file ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Зберігає великі масиви JSON даних у файл з використанням потоків.
   * Записує дані частинами для обробки великих обсягів даних.
   * @param {string} filePath - Відносний шлях до файлу.
   * @param {Array} dataArray - Масив даних для збереження.
   * @returns {Promise<void>}
   */
  async saveLargeJson(filePath, dataArray) {
    try {
      const writableStream = this.createWriteStream(filePath, { flags: 'w' });
      writableStream.write('[');
      this.log(`Started saving large JSON data to file: ${filePath}`);

      for (let i = 0; i < dataArray.length; i++) {
        if (i > 0) writableStream.write(',');
        const jsonChunk = JSON.stringify(dataArray[i]);
        writableStream.write(jsonChunk);
        if (i % 5 === 0) {
          // Введення невеликої затримки для уникнення перевантаження системи
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      writableStream.write(']');
      writableStream.end();

      // Повертає проміс, що вирішується, коли потік закінчує запис
      return new Promise((resolve, reject) => {
        writableStream.on('finish', () => {
          this.log(`Finished saving large JSON data to file: ${filePath}`);
          resolve();
        });
        writableStream.on('error', reject);
      });
    } catch (error) {
      console.error(`Error saving large JSON data to ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Зберігає великі масиви JSON даних у пам'яті.
   * Розділяє дані на частини, щоб уникнути переповнення пам'яті.
   * @param {string} key - Ключ для зберігання даних у пам'яті.
   * @param {Array} dataArray - Масив даних для збереження.
   */
  saveLargeJsonInMemory(key, dataArray) {
    try {
      const jsonSize = Buffer.byteLength(JSON.stringify(dataArray));
      if (jsonSize > this.maxMemorySize) {
        throw new Error('Data size exceeds memory limit');
      }

      // Очистка пам'яті перед збереженням нових даних
      if (this.memoryStorage.size >= 5) {
        const firstKey = this.memoryStorage.keys().next().value;
        this.memoryStorage.delete(firstKey);
      }

      this.memoryStorage.set(key, dataArray);
      this.log(`Saved large JSON data to memory under key: ${key}`);
    } catch (error) {
      console.error(`Error saving JSON data to memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Отримує дані з пам'яті.
   * @param {string} key - Ключ для доступу до даних у пам'яті.
   * @returns {Array}
   */
  getJsonFromMemory(key) {
    try {
      if (!this.memoryStorage.has(key)) {
        throw new Error(`No data found in memory with key: ${key}`);
      }
      this.log(`Retrieved JSON data from memory with key: ${key}`);
      return this.memoryStorage.get(key);
    } catch (error) {
      console.error(`Error retrieving JSON data from memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Видаляє дані з пам'яті.
   * @param {string} key - Ключ для видалення даних з пам'яті.
   */
  deleteFromMemory(key) {
    try {
      if (!this.memoryStorage.has(key)) {
        throw new Error(`No data found in memory with key: ${key}`);
      }
      this.memoryStorage.delete(key);
      this.log(`Deleted JSON data from memory with key: ${key}`);
    } catch (error) {
      console.error(`Error deleting JSON data from memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Створює ZIP архів з указаних файлів.
   * @param {string} archivePath - Шлях до вихідного архіву.
   * @param {Array<string>} files - Масив шляхів до файлів для архівації.
   * @returns {Promise<void>}
   */
  async createZipArchive(archivePath, files) {
    try {
      const output = this.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.log(`Created ZIP archive at: ${archivePath}`);
      });

      archive.pipe(output);

      files.forEach(file => {
        const fullPath = path.join(this.basePath, file);
        archive.file(fullPath, { name: path.basename(file) });
      });

      await archive.finalize();
    } catch (error) {
      console.error(`Error creating ZIP archive ${archivePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Розпаковує ZIP архів у вказану директорію.
   * @param {string} archivePath - Шлях до ZIP архіву.
   * @param {string} extractDir - Директорія для розпаковування архіву.
   * @returns {Promise<void>}
   */
  async extractZipArchive(archivePath, extractDir) {
    try {
      await this.ensureDirectoryExists(extractDir);
      this.log(`Extracting ZIP archive from: ${archivePath} to directory: ${extractDir}`);

      await fsPromises.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();

      this.log(`Extracted ZIP archive to directory: ${extractDir}`);
    } catch (error) {
      console.error(`Error extracting ZIP archive ${archivePath}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FileSystem;
