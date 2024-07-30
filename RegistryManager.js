const regedit = require('regedit');
const path = require('path');
const assert = require('assert');

// Встановлення регedit у режимі обіцянок
regedit.promisify();

class RegistryManager {
  /**
   * Конструктор класу RegistryManager.
   * @param {boolean} logEnabled - Увімкнути логування.
   */
  constructor(logEnabled = false) {
    this.logEnabled = logEnabled;
  }

  /**
   * Логування повідомлень, якщо увімкнено.
   * @param {string} message - Повідомлення для логування.
   */
  log(message) {
    if (this.logEnabled) {
      console.log(message);
    }
  }

  /**
   * Читання значення з реєстру.
   * @param {string} key - Шлях до ключа реєстру.
   * @param {string} value - Ім'я значення.
   * @returns {Promise<any>} - Значення з реєстру або null, якщо значення не знайдено.
   */
  async readValue(key, value) {
    try {
      const result = await regedit.list([key]);
      return result[key] && result[key][value] ? result[key][value].value : null;
    } catch (error) {
      console.error(`Error reading registry value from ${key}\\${value}: ${error.message}`);
      return null;
    }
  }

  /**
   * Запис значення в реєстр.
   * @param {string} key - Шлях до ключа реєстру.
   * @param {string} value - Ім'я значення.
   * @param {any} data - Дані для запису.
   * @param {string} [type='REG_SZ'] - Тип значення.
   * @returns {Promise<void>}
   */
  async writeValue(key, value, data, type = 'REG_SZ') {
    try {
      await this.ensureKey(key);
      await regedit.putValue({
        [key]: {
          [value]: {
            value: data,
            type: type
          }
        }
      });
      this.log(`Value written to ${key}\\${value}`);
    } catch (error) {
      console.error(`Error writing registry value to ${key}\\${value}: ${error.message}`);
    }
  }

  /**
   * Переконатися, що значення існує, і при необхідності створити його з даними за замовчуванням.
   * @param {string} key - Шлях до ключа реєстру.
   * @param {string} value - Ім'я значення.
   * @param {any} defaultData - Дані за замовчуванням для створення.
   * @param {string} [type='REG_SZ'] - Тип значення.
   * @returns {Promise<void>}
   */
  async ensureValue(key, value, defaultData, type = 'REG_SZ') {
    try {
      const existingValue = await this.readValue(key, value);
      if (existingValue === null) {
        await this.writeValue(key, value, defaultData, type);
        this.log(`Value ${value} created with default data: ${defaultData}`);
      } else {
        this.log(`Value ${value} already exists: ${existingValue}`);
      }
    } catch (error) {
      console.error(`Error ensuring registry value ${value} at ${key}: ${error.message}`);
    }
  }

  /**
   * Видалення значення з реєстру.
   * @param {string} key - Шлях до ключа реєстру.
   * @param {string} value - Ім'я значення.
   * @returns {Promise<void>}
   */
  async deleteValue(key, value) {
    try {
      await regedit.deleteValue({ [key]: [value] });
      this.log(`Value ${value} deleted from ${key}`);
    } catch (error) {
      console.error(`Error deleting registry value ${value} from ${key}: ${error.message}`);
    }
  }

  /**
   * Створення ключа реєстру, включаючи проміжні ключі.
   * @param {string} key - Шлях до ключа реєстру.
   * @returns {Promise<void>}
   */
  async createKey(key) {
    try {
      await this.ensureKey(key);
      this.log(`Registry key ${key} created`);
    } catch (error) {
      console.error(`Error creating registry key ${key}: ${error.message}`);
    }
  }

  /**
   * Видалення ключа реєстру.
   * @param {string} key - Шлях до ключа реєстру.
   * @returns {Promise<void>}
   */
  async deleteKey(key) {
    try {
      await regedit.deleteKey([key]);
      this.log(`Registry key ${key} deleted`);
    } catch (error) {
      console.error(`Error deleting registry key ${key}: ${error.message}`);
    }
  }

  /**
   * Перевірка існування ключа реєстру.
   * @param {string} key - Шлях до ключа реєстру.
   * @returns {Promise<boolean>} - true, якщо ключ існує, інакше false.
   */
  async keyExists(key) {
    try {
      const result = await regedit.list([key]);
      return result[key] !== undefined;
    } catch (error) {
      console.error(`Error checking existence of registry key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Перевірка існування значення у ключі реєстру.
   * @param {string} key - Шлях до ключа реєстру.
   * @param {string} value - Ім'я значення.
   * @returns {Promise<boolean>} - true, якщо значення існує, інакше false.
   */
  async valueExists(key, value) {
    try {
      const result = await regedit.list([key]);
      return result[key] && result[key][value] !== undefined;
    } catch (error) {
      console.error(`Error checking existence of registry value ${value} in ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Переконатися, що ключ існує, створити всі проміжні ключі, якщо їх не існує.
   * @param {string} fullKeyPath - Повний шлях до ключа реєстру.
   * @returns {Promise<void>}
   */
  async ensureKey(fullKeyPath) {
    const keys = fullKeyPath.split('\\').filter(part => part.trim() !== '');
    let currentPath = '';

    for (const key of keys) {
      currentPath = path.join(currentPath, key);
      const exists = await this.keyExists(currentPath);
      if (!exists) {
        await regedit.putValue({ [currentPath]: {} });
        this.log(`Registry key ${currentPath} created`);
      }
    }
  }
}

// Тестові приклади
(async function() {
  const registry = new RegistryManager(true); // Увімкнути логування
  const testKey = 'HKEY_CURRENT_USER\\Software\\MyApp\\Settings';
  const testValue = 'MyValue';
  const testData = 'TestData';

  // Тест: створення ключа реєстру
  await registry.createKey(testKey);
  let exists = await registry.keyExists(testKey);
  assert.strictEqual(exists, true, `Key ${testKey} should exist`);

  // Тест: запис значення
  await registry.writeValue(testKey, testValue, testData);
  let value = await registry.readValue(testKey, testValue);
  assert.strictEqual(value, testData, `Value ${testValue} should be ${testData}`);

  // Тест: переконатися, що значення існує з даними за замовчуванням
  await registry.ensureValue(testKey, testValue, 'DefaultData');
  value = await registry.readValue(testKey, testValue);
  assert.strictEqual(value, testData, `Value ${testValue} should still be ${testData}`);

  // Тест: оновлення значення
  await registry.writeValue(testKey, testValue, 'UpdatedData');
  value = await registry.readValue(testKey, testValue);
  assert.strictEqual(value, 'UpdatedData', `Value ${testValue} should be updated to 'UpdatedData'`);

  // Тест: видалення значення
  await registry.deleteValue(testKey, testValue);
  value = await registry.readValue(testKey, testValue);
  assert.strictEqual(value, null, `Value ${testValue} should be deleted`);

  // Тест: видалення ключа реєстру
  await registry.deleteKey(testKey);
  exists = await registry.keyExists(testKey);
  assert.strictEqual(exists, false, `Key ${testKey} should be deleted`);

  // Тест: обробка неіснуючих ключів і значень
  const nonExistentKey = 'HKEY_CURRENT_USER\\Software\\MyApp\\NonExistent';
  const nonExistentValue = 'NonExistentValue';

  const keyExists = await registry.keyExists(nonExistentKey);
  assert.strictEqual(keyExists, false, `Key ${nonExistentKey} should not exist`);

  const valueExists = await registry.valueExists(nonExistentKey, nonExistentValue);
  assert.strictEqual(valueExists, false, `Value ${nonExistentValue} should not exist`);

  await registry.ensureValue(nonExistentKey, nonExistentValue, 'DefaultData');
  const value = await registry.readValue(nonExistentKey, nonExistentValue);
  assert.strictEqual(value, 'DefaultData', `Value ${nonExistentValue} should be created with default data`);

  console.log('All tests passed!');
})();
