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
    this.basePath = basePath; // Основний шлях для всіх операцій з файлами
    this.memoryStorage = new Map(); // Сховище для тимчасових даних в пам'яті
    this.maxMemorySize = 1024 * 1024 * 100; // Максимальний розмір кешу в байтах (100MB)
    this.enableLogging = enableLogging; // Увімкнення або вимкнення логування
  }

  /**
   * Логування повідомлень, якщо увімкнено.
   * @param {string} message - Повідомлення для логування.
   */
  log(message) {
    if (this.enableLogging) {
      console.log(message); // Виводить повідомлення в консоль
    }
  }

  /**
   * Перевіряє, чи існує директорія, і створює її, якщо не існує (асинхронний варіант).
   * @param {string} dirPath - Відносний або абсолютний шлях до директорії.
   * @returns {Promise<void>}
   */
  async ensureDirectoryExists(dirPath) {
    try {
      const fullPath = this.resolvePath(dirPath); // Перетворює відносний шлях у абсолютний
      await fsPromises.mkdir(fullPath, { recursive: true }); // Створює директорію, включаючи проміжні
      this.log(`Directory ensured: ${fullPath}`); // Логування успішного створення директорії
    } catch (error) {
      console.error(`Error ensuring directory exists ${dirPath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Перевіряє, чи існує директорія, і створює її, якщо не існує (синхронний варіант).
   * @param {string} dirPath - Відносний або абсолютний шлях до директорії.
   */
  ensureDirectoryExistsSync(dirPath) {
    try {
      const fullPath = this.resolvePath(dirPath); // Перетворює відносний шлях у абсолютний
      fs.mkdirSync(fullPath, { recursive: true }); // Створює директорію, включаючи проміжні
      this.log(`Directory ensured: ${fullPath}`); // Логування успішного створення директорії
    } catch (error) {
      console.error(`Error ensuring directory exists ${dirPath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Перевіряє, чи файл заблокований або недоступний для запису (асинхронний варіант).
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @returns {Promise<boolean>}
   */
  async isFileLocked(filePath) {
    try {
      const fullPath = this.resolvePath(filePath); // Перетворює відносний шлях у абсолютний
      await fsPromises.access(fullPath, fs.constants.W_OK); // Перевіряє доступність файлу для запису
      this.log(`File is not locked: ${fullPath}`); // Логування, якщо файл не заблокований
      return false; // Файл не заблокований
    } catch (error) {
      if (error.code === 'EACCES') {
        this.log(`File is locked: ${fullPath}`); // Логування, якщо файл заблокований
        return true; // Файл заблокований або недоступний
      }
      throw error; // Перекидання помилки, якщо це не помилка дозволу
    }
  }

  /**
   * Додає дані до файлу без перезапису (асинхронний варіант).
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @param {string | Buffer} data - Дані для додавання.
   * @param {string} [encoding='utf8'] - Кодування файлу.
   */
  async appendFile(filePath, data, encoding = 'utf8') {
    try {
      const fullPath = this.resolvePath(filePath); // Перетворює відносний шлях у абсолютний
      await this.ensureDirectoryExists(path.dirname(fullPath)); // Переконується, що директорія існує
      await fsPromises.appendFile(fullPath, data, encoding); // Додає дані до файлу
      this.log(`Appended to file: ${fullPath}`); // Логування успішного додавання
    } catch (error) {
      console.error(`Error appending to file ${filePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Створює потік для читання файлу.
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @param {object} [options] - Опції для створення потоку.
   * @returns {Readable}
   */
  createReadStream(filePath, options) {
    try {
      const fullPath = this.resolvePath(filePath); // Перетворює відносний шлях у абсолютний
      this.log(`Creating read stream for file: ${fullPath}`); // Логування створення потоку
      return createReadStream(fullPath, options); // Повертає потік для читання
    } catch (error) {
      console.error(`Error creating read stream for file ${filePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Створює потік для запису файлу.
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @param {object} [options] - Опції для створення потоку.
   * @returns {Writable}
   */
  createWriteStream(filePath, options) {
    try {
      const fullPath = this.resolvePath(filePath); // Перетворює відносний шлях у абсолютний
      const dirPath = path.dirname(fullPath); // Отримує директорію для створення
      this.ensureDirectoryExistsSync(dirPath); // Переконується, що директорія існує
      this.log(`Creating write stream for file: ${fullPath}`); // Логування створення потоку
      return createWriteStream(fullPath, options); // Повертає потік для запису
    } catch (error) {
      console.error(`Error creating write stream for file ${filePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Зберігає великі масиви JSON даних у файл з використанням потоків.
   * Записує дані частинами для обробки великих обсягів даних.
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @param {Array} dataArray - Масив даних для збереження.
   * @returns {Promise<void>}
   */
  async saveLargeJson(filePath, dataArray) {
    try {
      const fullPath = this.resolvePath(filePath); // Перетворює відносний шлях у абсолютний
      const writableStream = this.createWriteStream(fullPath, { flags: 'w' }); // Створює потік для запису
      writableStream.write('['); // Пише початок JSON масиву
      this.log(`Started saving large JSON data to file: ${fullPath}`); // Логування початку збереження

      for (let i = 0; i < dataArray.length; i++) {
        if (i > 0) writableStream.write(','); // Додає коми між елементами масиву
        const jsonChunk = JSON.stringify(dataArray[i]); // Конвертує дані в JSON формат
        writableStream.write(jsonChunk); // Записує JSON в файл
        if (i % 5 === 0) {
          // Введення невеликої затримки для уникнення перевантаження системи
          await new Promise(resolve => setImmediate(resolve));
        }
      }

      writableStream.write(']'); // Пише кінець JSON масиву
      writableStream.end(); // Завершує запис
      this.log(`Completed saving large JSON data to file: ${fullPath}`); // Логування завершення збереження
    } catch (error) {
      console.error(`Error saving large JSON data to file ${filePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Завантажує великий JSON файл частинами для обробки даних.
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @param {Function} processChunk - Функція для обробки кожного шматка даних.
   * @returns {Promise<void>}
   */
  async processLargeJson(filePath, processChunk) {
    try {
      const fullPath = this.resolvePath(filePath); // Перетворює відносний шлях у абсолютний
      const readStream = this.createReadStream(fullPath); // Створює потік для читання
      let jsonString = ''; // Змінна для зберігання JSON рядка

      readStream.on('data', chunk => {
        jsonString += chunk; // Накопичує частини JSON рядка
      });

      readStream.on('end', async () => {
        try {
          const jsonData = JSON.parse(jsonString); // Конвертує JSON рядок в об'єкт
          await processChunk(jsonData); // Обробляє отримані дані
        } catch (error) {
          console.error(`Error processing JSON data from file ${filePath}: ${error.message}`); // Логування помилки
          throw error; // Перекидання помилки
        }
      });

      readStream.on('error', error => {
        console.error(`Error reading file ${filePath}: ${error.message}`); // Логування помилки читання
        throw error; // Перекидання помилки
      });
    } catch (error) {
      console.error(`Error processing large JSON file ${filePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Зберігає дані в пам'яті для подальшого використання.
   * @param {string} key - Ключ для доступу до даних у пам'яті.
   * @param {Array} data - Дані для збереження.
   * @returns {Promise<void>}
   */
  async saveToMemory(key, data) {
    try {
      if (this.memoryStorage.size >= this.maxMemorySize) {
        throw new Error('Memory cache limit reached. Consider clearing some data.'); // Перевірка переповнення кешу
      }
      this.memoryStorage.set(key, data); // Зберігає дані в пам'яті
      this.log(`Saved JSON data to memory with key: ${key}`); // Логування успішного збереження
    } catch (error) {
      console.error(`Error saving JSON data to memory: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Завантажує дані з пам'яті за вказаним ключем.
   * @param {string} key - Ключ для доступу до даних у пам'яті.
   * @returns {Array} - Завантажені дані.
   */
  getJsonFromMemory(key) {
    try {
      if (!this.memoryStorage.has(key)) {
        throw new Error(`No data found in memory with key: ${key}`); // Перевірка наявності даних
      }
      this.log(`Retrieved JSON data from memory with key: ${key}`); // Логування успішного отримання
      return this.memoryStorage.get(key); // Повертає дані з пам'яті
    } catch (error) {
      console.error(`Error retrieving JSON data from memory: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Видаляє дані з пам'яті за вказаним ключем.
   * @param {string} key - Ключ для видалення даних з пам'яті.
   */
  deleteFromMemory(key) {
    try {
      if (!this.memoryStorage.has(key)) {
        throw new Error(`No data found in memory with key: ${key}`); // Перевірка наявності даних
      }
      this.memoryStorage.delete(key); // Видаляє дані з пам'яті
      this.log(`Deleted JSON data from memory with key: ${key}`); // Логування успішного видалення
    } catch (error) {
      console.error(`Error deleting JSON data from memory: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
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
      const fullPath = this.resolvePath(archivePath); // Перетворює відносний шлях у абсолютний
      const output = this.createWriteStream(fullPath); // Створює потік для запису архіву
      const archive = archiver('zip', { zlib: { level: 9 } }); // Створює архіватор ZIP з максимальним рівнем стиснення

      output.on('close', () => {
        this.log(`Created ZIP archive at: ${fullPath}`); // Логування успішного створення архіву
      });

      archive.pipe(output); // Проводить потік архіву до потоку виходу

      files.forEach(file => {
        const filePath = this.resolvePath(file); // Перетворює відносний шлях у абсолютний
        archive.file(filePath, { name: path.basename(file) }); // Додає файл до архіву
      });

      await archive.finalize(); // Завершує архівацію
    } catch (error) {
      console.error(`Error creating ZIP archive ${archivePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
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
      const fullArchivePath = this.resolvePath(archivePath); // Перетворює відносний шлях у абсолютний
      const fullExtractDir = this.resolvePath(extractDir); // Перетворює відносний шлях у абсолютний
      await this.ensureDirectoryExists(fullExtractDir); // Переконується, що директорія існує
      this.log(`Extracting ZIP archive from: ${fullArchivePath} to directory: ${fullExtractDir}`); // Логування початку розпаковування

      await fsPromises.createReadStream(fullArchivePath)
        .pipe(unzipper.Extract({ path: fullExtractDir })) // Розпаковує архів у вказану директорію
        .promise();

      this.log(`Extracted ZIP archive to directory: ${fullExtractDir}`); // Логування успішного розпаковування
    } catch (error) {
      console.error(`Error extracting ZIP archive ${archivePath}: ${error.message}`); // Логування помилки
      throw error; // Перекидання помилки
    }
  }

  /**
   * Вирішує шлях до файлу, перетворюючи відносні шляхи на абсолютні.
   * @param {string} filePath - Відносний або абсолютний шлях до файлу.
   * @returns {string} Абсолютний шлях до файлу.
   */
  resolvePath(filePath) {
    // Перевіряє, чи шлях вже абсолютний, або перетворює відносний шлях у абсолютний
    return path.isAbsolute(filePath) ? filePath : path.join(this.basePath, filePath);
  }
}

module.exports = FileSystem;
