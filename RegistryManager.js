// callback api
let regedit = require("regedit");
const path = require("path");
const assert = require("assert");


/**
 * Клас для роботи з реєстром Windows.
 * Містить методи для читання, запису, видалення значень та створення/видалення ключів.
 */
class RegistryManager {
    /**
     * Конструктор класу RegistryManager.
     * @param {boolean} logEnabled - Увімкнути логування (за замовчуванням false).
     * @param {string} vbsDirectory - кастомний шлях до папки із скриптами (за замовчуванням null).
     */
    constructor(logEnabled = false, vbsDirectory = null) {
        this.logEnabled = logEnabled;
        // Налаштування бібліотеки - regedit для функціонування всього класу
        if (vbsDirectory) {
            this.log(`Set vbsDirectory: ${vbsDirectory}`)
            regedit.setExternalVBSLocation(vbsDirectory)
        }
        // promise api
        regedit = regedit.promisified
    }

    /**
     * Логування повідомлень, якщо увімкнено.
     * @param {string} message - Повідомлення для логування.
     */
    log(message) {
        if (this.logEnabled) {
            console.log(`[LOG]: ${message}`);
        }
    }

    //! <========================== LIST (структура реєстру) ==============================>



    //! <========================== Key ==============================>

    /** + 
     * Перевірка існування ключа реєстру.
     * @param {string} key - Шлях до ключа реєстру.
     * @returns {Promise<boolean>} - true, якщо ключ існує, інакше false.
     */
    async keyExists(key) {
        try {
            this.log(`Checking if key ${key} exists`)
            const result = await regedit.list([key]);
            return result[key]["exists"];
        } catch (error) {
            console.error(`Error checking existence of registry key ${key}: ${error.message}`);
            return false;
        }
    }


    /** +
     * Створення ключа реєстру.
     * @param {string} key - Шлях до ключа реєстру.
     * @returns {Promise<void>}
     */
    async createKey(key) {
        try {
            this.log(`Creating key ${key}`)
            const exists = await this.keyExists(key);
            if (!exists) {
                await regedit.createKey(key);
            }
        } catch (error) {
            console.error(`Error creating registry key ${key}: ${error.message}`);
        }
    }


    /** +
     * Видалення ключа реєстру.
     * @param {string} key - Шлях до ключа реєстру.
     * @returns {Promise<void>}
     */
    async deleteKey(key) {
        try {
            this.log(`Deleting key ${key}`);
            const exists = await this.keyExists(key);
            if (exists) {
                await regedit.deleteKey(key);
            }

        } catch (error) {
            console.error(`Error deleting registry key ${key}: ${error.message}`);
        }
    }


    /** +
     * Переконатися, що ключ існує, створити всі проміжні ключі, якщо їх не існує.
     * @param {string} fullKeyPath - Повний шлях до ключа реєстру.
     * @returns {Promise<void>}
     */
    async ensureKey(fullKeyPath) {
        this.log(`Ensuring key ${fullKeyPath} exists`)
        const keys = fullKeyPath.split('\\').filter(part => part.trim() !== '');
        let currentPath = '';

        for (const key of keys) {
            currentPath = path.join(currentPath, key);
            const exists = await this.keyExists(currentPath);
            if (!exists) {
                await this.createKey(currentPath);
            }
        }
    }

    //! <========================== Value ==============================>

    /** +
    * Запис / оновлення значення в реєстрі.
    * @param {string} key - Шлях до ключа реєстру.
    * @param {string} value - Ім'я значення.
    * @param {any} data - Дані для запису.
    * @param {string} [type='REG_SZ'] - Тип значення.
    * @returns {Promise<void>}
    */
    async writeValue(key, value, data, type = 'REG_SZ') {
        try {
            this.log(`Writing value ${value} to ${key}`);
            await this.ensureKey(key);
            await regedit.putValue({
                [key]: {
                    [value]: {
                        value: data,
                        type: type
                    }
                }
            });
        } catch (error) {
            console.error(`Error writing registry value to ${key}\\${value}: ${error.message}`);
        }
    }


    /** +
     * Перевірка існування значення у ключі реєстру.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення.
     * @returns {Promise<boolean>} - true, якщо значення існує, інакше false.
     */
    async valueExists(key, value) {
        try {
            const result = await regedit.list([key]);
            return result[key]["exists"] && result[key]["values"][value] !== undefined;
        } catch (error) {
            console.error(`Error checking existence of registry value ${value} in ${key}: ${error.message}`);
            return false;
        }
    }


    /** +
     * Читання значення з реєстру.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення.
     * @returns {Promise<any>} - Значення з реєстру або null, якщо значення не знайдено.
     */
    async readValue(key, value) {
        try {
            const result = await regedit.list([key]);
            return result[key]["exists"] && result[key]["values"][value] !== undefined ? result[key]["values"][value]["value"] : null;
        } catch (error) {
            console.error(`Error reading registry value from ${key}\\${value}: ${error.message}`);
            return null;
        }
    }


    /** +?
     * Переконатися, що значення існує, інакше створити його з даними за замовчуванням.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення.
     * @param {any} defaultData - Дані за замовчуванням для створення.
     * @param {string} [type='REG_SZ'] - Тип значення.
     * @returns {Promise<any>} - Значення з реєстру або null, якщо значення не знайдено.
     */
    async ensureValue(key, value, defaultData, type = 'REG_SZ') {
        try {
            this.log(`Ensuring value ${value} exists at ${key}`);
            const existingValue = await this.readValue(key, value);
            if (existingValue !== null) {
                return existingValue
            }

            if (existingValue === null) {
                await this.writeValue(key, value, defaultData, type);
            }

            return null
        } catch (error) {
            console.error(`Error ensuring registry value ${value} at ${key}: ${error.message}`);
        }
    }


    /** + 
     * Видалення значення з реєстру.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення.
     * @returns {Promise<void>}
     */
    async deleteValue(key, value) {
        try {
            this.log(`Deleting value ${value} from ${key}`);
            await regedit.deleteValue(`${key}\\${value}`);
        } catch (error) {
            console.error(`Error deleting registry value ${value} from ${key}: ${error.message}`);
        }
    }


    //! <========================== Custom Methods ==============================>


    /** +
     * Зберегти або перемістити логін користувача на початок в списку користувачів.
     * @param {string} login - Логін користувача.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення (за замовчуванням "users").
     * @returns {Promise<void>}
     */
    async saveOrUpdateUser(login, key, value = "users") {
        // Дістаємо дані з ресєтру
        let userList = await this.readValue(key, value)
        // Якщо нічого не отримали, тоді формуємо пустий початковий список
        if (!userList) {
            userList = []
        }
        // Знаходимо індекс користувача у списку
        const index = userList.indexOf(login)
        // Якщо логін користувача вже присутній у списку
        if (index !== -1) {
            // Видаляємо користувача зі списку за його індексом
            userList.splice(index, 1)
        }
        // Додаємо користувача на початок списку
        userList.unshift(login)
        // Записуємо оновленні дані назад у реєстр
        await this.writeValue(key, value, userList, "REG_MULTI_SZ")
    }

    /** +
     * Видалити логін користувача із списку користувачів.
     * @param {string} login - Логін користувача.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення (за замовчуванням "users").
     * @returns {Promise<void>}
     */
    async deleteUser(login, key, value = "users") {
        // Дістаємо дані з ресєтру
        let userList = await this.readValue(key, value)
        // Якщо нічого не отримали, тоді вертаємо що видалено 
        if (!userList) {
            return true
        }
        // Знаходимо індекс користувача у списку
        const index = userList.indexOf(login)
        // Якщо логін користувача вже присутній у списку
        if (index !== -1) {
            // Видаляємо користувача зі списку за його індексом
            userList.splice(index, 1)
        }
        // Записуємо оновленні дані назад у реєстр
        await this.writeValue(key, value, userList, "REG_MULTI_SZ")
    }


    /** +
     * Дістати всі логіни користувачів із списку користувачів.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення (за замовчуванням "users").
     * @returns {Promise<any>} - Список з логінами користувачів
     */
    async getUsers(key, value = "users") {
        // Дістаємо дані з ресєтру
        let userList = await this.readValue(key, value)
        // Якщо нічого не отримали, тоді вертаємо пустий список користувачів
        if (!userList) {
            return []
        }

        return userList
    }


    /** +
     * Перевірити чи поточний компютер є термінальним сервером
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення (за замовчуванням "isTerminalServer").
     * @returns {Promise<boolean>} - Вертаємо true якщо пк є термінальним сервером, інакше false
     */
    async isTerminalServer(key, value = "isTerminalServer") {
        // Дістаємо дані з ресєтру, якщо нема надаємо дефолтне значення (не термінальний сервер)
        let result = await this.ensureValue(key, value, 0, "REG_SZ")
        // Якщо ми отримаои 1 значить цей пк є термінальним сервером
        if (result == 1) {
            return true
        }

        return false
    }


    /** +
     * Записати шлях до папки куди зберігається завантаженні дані
     * @param {string} pathToDownloadDir - Шлях до директорії куда зберігаються скачані файли.
     * @param {string} key - Шлях до ключа реєстру.
     * @param {string} value - Ім'я значення (за замовчуванням "pathToDownloadDirectory").
     * @returns {Promise<void>} 
     */
    async setPathToDownloadDirectory(pathToDownloadDir, key, value = "pathToDownloadDirectory") {
        // Зберігаємо дані в реєстрі дані з ресєтру
        await this.writeValue(key, value, pathToDownloadDir, "REG_SZ")
    }


}



// Тестування класу RegistryManager
(async function () {
    const registry = new RegistryManager();
    // const testKey = "HKCU\\Software\\MyApp\\Settings";
    // const testValue = "MyValue";
    // const testData = "TestData";

    // // Тест: створення ключа реєстру
    // await registry.createKey(testKey);
    // let exists = await registry.keyExists(testKey);
    // assert.strictEqual(exists, true, `Key ${testKey} should exist`);

    // // Тест: запис значення
    // await registry.writeValue(testKey, testValue, testData);
    // let valueExists = await registry.valueExists(testKey, testValue)
    // assert.strictEqual(valueExists, true, `Value ${valueExists} should be true`);

    // let value = await registry.readValue(testKey, testValue);
    // assert.strictEqual(value, testData, `Value ${testValue} should be ${testData}`);

    // // Тест: переконатися, що значення існує або створити його з дефолтними даними ?
    // await registry.ensureValue(testKey, testValue, 'DefaultData');
    // value = await registry.readValue(testKey, testValue);
    // assert.strictEqual(value, testData, `Value ${testValue} should still be ${testData}`);

    // // Тест: оновлення значення
    // await registry.writeValue(testKey, testValue, 'UpdatedData');
    // value = await registry.readValue(testKey, testValue);
    // assert.strictEqual(value, 'UpdatedData', `Value ${testValue} should be updated to 'UpdatedData'`);

    // // Тест: видалення значення
    // await registry.deleteValue(testKey, testValue);
    // value = await registry.readValue(testKey, testValue);
    // assert.strictEqual(value, null, `Value ${testValue} should be deleted`);

    // // Тест: видалення ключа реєстру
    // await registry.deleteKey(testKey);
    // exists = await registry.keyExists(testKey);
    // assert.strictEqual(exists, false, `Key ${testKey} should be deleted`);

    // // Тест: обробка неіснуючих ключів і значень
    // const nonExistentKey = 'HKCU\\Software\\MyApp\\NonExistent';
    // const nonExistentValue = 'NonExistentValue';

    // const keyExists = await registry.keyExists(nonExistentKey);
    // assert.strictEqual(keyExists, false, `Key ${nonExistentKey} should not exist`);

    // valueExists = await registry.valueExists(nonExistentKey, nonExistentValue);
    // assert.strictEqual(valueExists, false, `Value ${nonExistentValue} should not exist`);

    // await registry.ensureValue(nonExistentKey, nonExistentValue, 'DefaultData');
    // value = await registry.readValue(nonExistentKey, nonExistentValue);
    // assert.strictEqual(value, 'DefaultData', `Value ${nonExistentValue} should be created with default data`);
    // await registry.deleteKey(nonExistentKey);

    // console.log('All tests passed!');

    // await registry.saveOrUpdateUser("MULIARAV", "HKCU\\SOFTWARE\\sil\\portal")
    // await registry.deleteUser("MULIARAV", "HKCU\\SOFTWARE\\sil\\portal")
    // console.log(await registry.getUsers("HKCU\\SOFTWARE\\sil\\portal"))
    // console.log(await registry.isTerminalServer("HKCU\\SOFTWARE\\sil\\portal"))
    // await registry.setPathToDownloadDirectory("D:\\NotDelete\\Portal\\loaded_app", "HKCU\\SOFTWARE\\sil\\portal" )
})

// Запуск тестів
// ();


module.exports = RegistryManager;
