// 1111

const { app, Tray, Menu, nativeImage } =  require('electron')
const { appManager } = require('./AppManager')
const path = require("path")


module.exports = class TrayMenu {
    constructor(iconPath, appName) {
        this.iconPath = iconPath
        this.defaultTemplateMenu = [
            {   
                label: 'Вихід',
                type: 'normal',
                icon: this.createNativeImage(path.join(__dirname, "../img/exit24.png")),
                // дія, що має відбутися якщо клікнуть по цьому айтему лівою кнопкою миші
                click: () => { 
                    app.quit(); 
                },
            }, 
        ]
        // Створюємо сам трей
        this.tray = new Tray(this.createNativeImage(this.iconPath));
        this.tray.setContextMenu(this.createMenu());
        this.tray.setToolTip(appName)
    }

    createNativeImage(iconPath) {
        // Since we never know where the app is installed,
        // we need to add the app base path to it.
        // const path = `${app.getAppPath()}${this.iconPath}`;
        const image = nativeImage.createFromPath(iconPath).resize({width: 24, height: 24});
        // Marks the image as a template image.
        image.setTemplateImage(true);
        return image;
    }

    createMenu() {
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Tokei',
                type: 'normal',
                click: () => { 
                    /* Later this will open the Main Window */ 
                    appManager.getWindow('MainWindow').window.show();
                }
            },
            {
                label: 'Вихід',
                type: 'normal',
                icon: this.createNativeImage(path.join(__dirname, "../img/exit24.png")),
                click: () => {
                    app.quit()
                }
            }
        ]);


        return contextMenu;
    }

}



// 22
const config = require("../config/config")
const { app, Tray, Menu } = require('electron/main')
const path = require('node:path')


class CustomTray {
    constructor() {
        this.window = null
        this.tray = null
        this.menu = null
        this.defaultTemplateMenu = [
            {   
                // id: "item2",
                label: 'Вихід', 
                icon: path.join(__dirname, "../img/exit24.png"),
                // дія, що має відбутися якщо клікнуть по цьому айтему лівою кнопкою миші
                click: () => { 
                    app.quit(); 
                },
            }, 
        ]
    }


    // створюємо сам трей для додатку
    async createTray (window) {
        // запам'ятовуємо вікно
        this.window = window

        // створюємо сам трей і даємо йому іконку
        this.tray = new Tray(config.PATH_ICO)   // path.join(__dirname, "../img/fav3.png")   config.PATH_ICO

        // вказуємо напис, який буде з'являтися при наведені на значок 
        this.tray.setToolTip("Portal")

        // Встановлюємо дефолтний вигляд меню трея
        await this.setDefaultMenuTray()

        
        // прив'язуємо до значка подію кліку лівою кнопкою миші
        this.tray.on("click", () => {

            // Робимо перевірку чи вікно показується, якщо так ховаємо його
            if (this.window.isVisible()) {
                this.window.hide()

            } else {
                this.window.show()
            }
        }) 
    }


    // Встановити дефолтний вигляд меню трея
    async setDefaultMenuTray(){
        // Будуємо меню по шаблону
        this.menu = Menu.buildFromTemplate(this.defaultTemplateMenu)

        // Встановлюємо дефолтне меню до трея
        this.tray.setContextMenu(this.menu)
    }


    // Встановити або оновити меню в трея
    async setMenuTray(data = []) {
        
        // отримуємо сформований елемент меню -- Додатки
        const menuApps = await this.addOrUpdatesMenuApps(data)

        // формуємо шаблон оновленого меню
        let newTemplateMenu = [ 
            ...menuApps,
            {
                type: 'separator',
            },
            ...this.defaultTemplateMenu,
        ]

        // формуємо меню, по шаблону
        const newMenu = Menu.buildFromTemplate(newTemplateMenu)

        this.menu = newMenu

        // встановлюємо нове сформоване меню до нашого трея
        this.tray.setContextMenu(newMenu)
    }


    // сформувати повністю елемент меню - Додатки
    async addOrUpdatesMenuApps(listApps = []) {
        // шаблон підменю додатків
        let submenuTemplate = []

        listApps.forEach((element, index) => {
            // Формуємо елемент меню з даними
            const objectMenuApp = {
                // id: `${element["idApp"]}`,
                label: element["nameApp"],
                icon: path.join(__dirname, "../img/cubes16.png"),
                click: () => {
                    return this.window.webContents.send("runAppFromTray",  element["idApp"])
                },
            }

            // додаємо елементи до шаблону
            submenuTemplate.push(objectMenuApp)
        })


        // Елемент меню - Додатки з його піделементами
        const objectMenu = [
            {
                label: "Додатки",
                icon: path.join(__dirname, "../img/apps24.png"),
                submenu: submenuTemplate,
            }
        ]

        // вертаємо елемент меню -- Додатки
        return submenuTemplate
    }

}



module.exports = new CustomTray()



// 333
const { MainWindow } = require('./MainWindow')


class AppManager {
    constructor() {
        this.trayMenu = null;
        this.windowManager = new Map();
    }
   
    setTray(tray) {
        this.trayMenu = tray;
    }

    getTray() {
        return this.trayMenu;
    }

    setWindow(name, element) {
        this.windowManager.set(name, element);
    }

    getWindow(name) {
        const element = this.windowManager.get(name);
        if (element) {
            return element;
        }
        throw new Error(`[AppManager] - Element with name ${name} doesn't exist!`)
    }

    deleteWindow(name) {
        this.windowManager.delete(name)
    }
}


// export const appManager = new AppManager()

const appManager = new AppManager()

module.exports = {
    appManager,
}


// 444
async saveUserSettings (login, userArraySettings, dbName) {

        // Список параметрів на оновлення додатків
        let parametersForUpdate = []

        // Список параметрів для вставки в базу (нові, яких нема у користувача)
        let parametersForInsert = []

        //! <======================================>

        // отримати дані наявних налаштувань по типам і їх значенях
        const sql1 = 'select t.* from BASE_OBJ.IT_USERS_SETTINGS_ATTR_VAL t'

        // Параметри до запиту
        const parameters1 = {}

        // отримуємо інформацію з бази по відношенням типу і значень
        const userSettingsAttrValData = await OracleDBManager.query(dbName, sql1, parameters1)
        // console.log(userSettingsAttrValData)

        //! <======================================>

        // // будуємо запит для отримання всіх налаштуваннь по даному користувачу
        // const sql2 = `select 
        //                 *
        //             from BASE_OBJ.IT_USER_SETTINGS_V t
        //             where t.user_login = :login`

        // // Параметри до запиту
        // const parameters2 = {
        //     login: login.replace(/"/g,'')
        // }

        // // отримуємо інформацію з бази
        // const userSettingsDB = (await OracleDBManager.execute(sql2, parameters2)).rows
        // console.log(userSettingsDB)

        const userSettingsDB = await this.getUserSettings(login, dbName)

        //! <======================================>
        if (userSettingsDB.length !== 0) {
            // перебираємо налаштування користувача з бази
            userSettingsDB.forEach( (db_obj) => {
                // Проходимося по налаштуванням які нам передає користувач
                userArraySettings.forEach( (obj) => {   
                    // console.log(db_obj)
                    // console.log("/n/n")
                    // console.log(obj)
                    // якщо налаштування ідентичні то нічого не робимо
                    if (db_obj["F_SET_ATTR_ID"] == obj["attrSetting"] && db_obj["F_SET_VAL_ID"] == obj["valSetting"]) {
                        // console.log(1)
                        return


                        // якщо такий тип налаштування вже є, але не співпадає тип додаємо його до апдейта
                    } else if (db_obj["F_SET_ATTR_ID"] == obj["attrSetting"] && db_obj["F_SET_VAL_ID"] != obj["valSetting"]) {
                        // console.log(2)
                        // Перебираємо доступні налаштування і шукаємо відповідний
                        userSettingsAttrValData.forEach( (userSettings) => {
                            // console.log(userSettings)
                            if (userSettings["F_SET_ATTR_ID"] == obj["attrSetting"] && userSettings["F_SET_VAL_ID"] == obj["valSetting"]) {
                                parametersForUpdate.push({
                                    id: db_obj["SETTING_ID"],
                                    new_val: userSettings["SET_ATTR_VAL_ID"]
                                })
                                // console.log(22)
                                return
                            }
                        })


                        // Такого налаштування нема значить ми додаємо його до інсерта
                    } else {
                        // console.log(3)
                        // Перебираємо доступні налаштування і шукаємо відповідний
                        userSettingsAttrValData.forEach( (userSettings) => {
                            if (userSettings["F_SET_ATTR_ID"] == obj["attrSetting"] && userSettings["F_SET_VAL_ID"] == obj["valSetting"]) {
                                parametersForInsert.push({
                                    login: login,
                                    new_val: userSettings["SET_ATTR_VAL_ID"]
                                })
                                // console.log(33)
                                return
                            }
                        })
                    }
                })
            })

        } else {
            // Проходимося по налаштуванням які нам передає користувач
            userArraySettings.forEach( (obj) => {   
                // Перебираємо доступні налаштування і шукаємо відповідний
                userSettingsAttrValData.forEach( (userSettings) => {
                    if (userSettings["F_SET_ATTR_ID"] == obj["attrSetting"] && userSettings["F_SET_VAL_ID"] == obj["valSetting"]) {
                        parametersForInsert.push({
                            login: login,
                            new_val: userSettings["SET_ATTR_VAL_ID"]
                        })
                        return
                    }
                }) 
            })
        }


        // console.log(parametersForUpdate)
        // Якщо є дані для update запускаємо відповідну дію
        if (parametersForUpdate.length > 0) {
            // будуємо запит
            const sql = `update BASE_OBJ.IT_USERS_SETTINGS 
                        set F_SET_ATTR_VAL_ID = :new_val
                        where SETTING_ID = :id`

            // запускаємо процеc онволення в базі
            const updateData = await OracleDBManager.queryMany(dbName, sql, parametersForUpdate)
        }

        // console.log(parametersForInsert)
        if (parametersForInsert.length > 0) {
            // будуємо запит
            const sql = `insert into BASE_OBJ.IT_USERS_SETTINGS(USER_LOGIN, F_SET_ATTR_VAL_ID)
                        values (:login, :new_val)`

            // запускаємо процеc додавання записів в базу
            const insertData = await OracleDBManager.queryMany(dbName, sql, parametersForInsert)

        }
       
        return 
    }



// 555

const dotenv = require('dotenv')
const path = require("path")
const { app } = require('electron');
// Завантажуємо відповідний env file
const NODE_ENV = "dev"  //process.env.NODE_ENV
dotenv.config({path: path.join(__dirname, `../../.env.${NODE_ENV}`)})


// Клас для майбутнього збереження всіх глобальних налаштувань
class Config {
    constructor() {
        // Дані додатку
        this.app = {
            // Назва додатку
            name: "Portal",
            // Шлях до іконки додатку
            iconPath: path.join(__dirname, "../img/portal256.png"),
            // Шлях до папки з іконками
            iconsPath: path.join(__dirname, "../img")
        }

        // шлях до корневої папки з програмою
        this.rootPath = null
        this.getRootPath()

        // url site 
        this.site = {
            host: process.env.SITE_HOST || null, //"it-portal.khnpp.ua",
            port: process.env.SITE_PORT || 443,
            url: () => { 
                return `https://${this.site.host}:${this.site.port}` 
            },
        }

        // url api
        this.api = {
            host: process.env.API_HOST || null, //"it-api.khnpp.ua",
            port: process.env.API_PORT || 3000,
            url: () => { 
                return `https://${this.api.host}:${this.api.port}` 
            },
        }

        // Глобальні параметри
        this.globalParams = {
            // по дифолту вважаємо що ми працюємо на звичайному пк (не термінальному)
            isTerminalServer: false,
            // Дані про користувача
            loginUser: null,
            loginUserModified: () => {
                return this.globalParams.loginUser
            },
            passwordUser: null,
            // Дані про базу
            tnsServer: null,
        }

        // Локальна база даних
        this.db = {
            local: {
                // Імя файлу де зберігається локальні дані
                NAME_FILE_LOCAL_DB: "info.json"
            }
        }

        // Робота з реєстром (шляхи в ньому)
        this.regEdit = {
            // адрес до папки з необхідними для роботи з реєкстром файлами
            vbsDirectory: () => {
                return path.join(this.rootPath, './resources/regedit/vbs')
            },
            //зберігаємо шлях до даних у реєстрі по додатку (new - portal) для конкретного юзера
            REGEDIT_PATH: "HKCU\\SOFTWARE\\sil\\portal",
            //зберігаємо шлях до даних у реєстрі по додатку (old - менеджер завантаження) для конкретного юзера
            REGEDIT_PATH_LF: "HKCU\\SOFTWARE\\sil\\loader_form",
        }

    }
    

    // Метод для отримання корневого шляху до папки з додатком
    getRootPath () {
        // this.rootPath = app.getPath("exe")
        // console.log(this.rootPath)

        let rootPath = app.getAppPath()
        // console.log(rootPath)
        
        // якщо ми знаходимося в архіві .asar то потрібно піднімання на 2 рівня вгоду, щоб папка була разом коло .exe файла додатку яким запускаємо програму (при зборці)
        if (rootPath.split(path.sep).pop().split(".").pop() == "asar") {
            rootPath = path.join(rootPath, "../../")
        }
        // Вертаємо шлях до робочої папки
        this.rootPath = rootPath
        return rootPath
    }


}



// Ignore SSL sertefications -- для виконання запитів до чогось
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
app.commandLine.appendSwitch('ignore-certificate-errors', true);


// Відключення закадрового рендерингу
// https://www.electronjs.org/ru/docs/latest/tutorial/offscreen-rendering
app.disableHardwareAcceleration()



// Експортуємо обєкт даного класу (Singlton)
module.exports = new Config()



// 6666 saveFiles from json

const { app } = require('electron/main')
const fs = require("fs")
const path = require("path")
const config = require("../config/config")

const localDB = require("./lowDB")



class DownloadAndSaveFiles {

    //! Робимо перевірку якщо нема необіхної папки ми її створюємо
    createFolderIfNotExists (folderPath) {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath)
            // console.log(`Create folder: ${folderPath}`)
        }
    }


    //! провіряємо чи є вест маршрут від корення до даної папки, якщо недістає проміжних папок ми їх рекурсивно достворюємо
    //! поки не отримуємо повний необхідний шлях
    createDirectoriesRecursively (directoryPath) {
        // розбиваємо весь маршрут на масив елементів
        const parts = directoryPath.split(path.sep)
        // console.log(parts)
        
        // обєднуємо елементи марштуру і робимо перевірку чи є в наявності дана частина і так до самого кінця маршруту
        parts.forEach( (part, index) => {
            // об'єднуємо елементи марштруу до папки
            const currentPath = path.join(...parts.slice(0, index + 1))
            // робимо перевірку і за необхідності створюємо недостаючі папки по маршруту
            this.createFolderIfNotExists(currentPath)
        })
    }


    //! отримати шлях до місце де мають зберігати скачувані модулі (відносно asar архіву електрона), якщо його нема то достворюємо шлях
    getPathToDir (path_app = "") {
        // отримати шлях до внутршінього архіву electrona - .asar
        let appPath = app.getAppPath()
        // якщо ми знаходимося в архіві .asar то робимо піднімання на 2 рівня вгоду, щоб папка була разом коло .exe файла додатку
        if (appPath.split(path.sep).pop().split(".").pop() == "asar") {
            appPath = path.join(appPath, "../../")
        }

        // шлях де будемо зберігати всі скачуванні модулі для порталу і їх внутршні папки
        let downloadFolderAppPath = path.join(appPath, "loaded_app", path_app)

        // робимо перевірку на якому пк ми працюємо дефолному чи термінальному, якщо це термінальний то модифікуємо шлях
        if(config.isTerminalServer) {
            // у назві папки від логіна залишаємо лише буквені символи, і стараємося прибрати всі спец символи
            downloadFolderAppPath = path.join(appPath, "loaded_app", config.loginUser.replace(/[^\wа-я]/gi, ""), path_app) //як варіант - видаляти конкретні символи - replace(/[\\/"'.,:-\s]/g, "")
        }

        // запускаємо перевірку наявності всього шляху від корення до самої папки і при необіхдності достворюємо недостаючі папки
        this.createDirectoriesRecursively(downloadFolderAppPath)
        
        // вертаємо повний шлях до місця збереження
        return downloadFolderAppPath
    }


        
    //! зберігаємо отримані blob дані у файловій системі
    async saveFilesFromJSON (pathApp, blobDataArray, dataApp = {}) {
        if (!blobDataArray.length){
            return
        }

        // console.log(blobDataArray)
        
        // const path_app = blobDataArray["systemTaskInfo"]["PATH_APP"]
        
        // const downloadFolderAppPath = path.join(__dirname, "../", path_app)
        // appPath = app.getAppPath()
        // if (appPath.split(path.sep).pop().split(".").pop() == "asar") {
        //     appPath = path.join(appPath, "../../")
        // }
        
        // const downloadFolderAppPath = path.join(appPath, "loaded_app", path_app)

        // const downloadFolderAppPath = getPathToDir(path_app)
        const downloadFolderAppPath = pathApp

        //! створюємо недостаючі папки для збережння файлів, перевірка, а вдруг нема (для захисту, провсяк випадок)
        this.createDirectoriesRecursively(downloadFolderAppPath)

        // fs.appendFile(path.join("D:", "log.txt"), `App path: ${appPath}\n`, () => {})
        // console.log(blobDataArray.length)

        // Зміні для логів
        let countFiles = 0
        let nameFiles = []

        //! проходимось по масиву отриманих даних і зберігаємо на комютері всі blob дані у вигляді файлів
        blobDataArray.forEach( async (item) => {
            //! перевіряємо чи не отримали випадково blob == null
            if (item.blobFile !== null) {
                let filePath

                //! умова яка перевіряє чи потрібно створити додаткову під папку для збереження даного файла, якщо так перевіряє чи є дана папка, якщо нема її сворюєм
                if (item.pathFile) {
                    let dirForAddFiles = path.join(downloadFolderAppPath, item.pathFile)
                    this.createDirectoriesRecursively(dirForAddFiles)
                    filePath = path.join(dirForAddFiles, item.nameFile)
                    
                } else {
                    filePath = path.join(downloadFolderAppPath, item.nameFile) // item.fileName
                }

                //! декодуємо інформацію, яку нам прислав сервер у закодованому варіанті base64
                const blobData = Buffer.from(item.blobFile, "base64") // item.blobData

                //! пробуємо зберегти файл на пк
                try {
                    //! ОБОВ'ЯЗКОВО має бути синхроний метод для (.exe), бо не будуть відкриватися .exe файли нормально і буде помилка що їх тримає інший процес
                    if (item.nameFile.split(".").pop() == "exe"){
                        fs.writeFileSync(filePath, blobData, (err) => {
                            if (err) {
                                console.error(`Error saving ${item.nameFile}: \n`, err)    // item.fileName
                            }
                        })

                    } else {
                        fs.writeFileSync(filePath, blobData, (err) => {
                            if (err) {
                                console.error(`Error saving ${item.nameFile}: \n`, err)    // item.fileName
                            }
                        })
                    }

                    countFiles += 1
                    nameFiles.push(item.nameFile)
                    

                } catch (err) {
                    console.error(`Error saving ${item.nameFile}: \n`, err)
                }
                
                // fs.appendFile(path.join("D:", "log.txt"), `Create or update file: ${filePath}\n`, () => {})
                // console.log(`Create or update file: ${filePath}`)
            }
        })
        
        
        // пишемо логи у локальну базу на пк користувача
        localDB.writeToDB(`updates`, {name: dataApp.nameApp, countFiles: countFiles, files: nameFiles})

        // return {
        //     path: downloadFolderAppPath,
        //     systemTaskInfo: blobDataArray["systemTaskInfo"],
        // }

        return
    }


}




module.exports = new DownloadAndSaveFiles()



// 7777 -- update

const config = require("../config/config")
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
var { spawn } = require('child_process');
// для windwows 7, 8, 8.1 для новіших не треба
const fetch = require("node-fetch")

// <=====================================================================>

// Specify the name of the directory you want to create (де має бути оновлювач)
const directoryName = 'updator';


// Create the directory in the same folder as the executable file (шлях до папки оновлення)
const directoryPath = path.join(config.getRootPath(), directoryName);



function checkVersion(json) {

    // можливо тут треба якось посилати сигнал на фронт про завершення перевірки оновлення

    const version = app.getVersion() 
    // робимо перевірку версії на сервері і даного додатку (наш портал)
    if(json.versionApp && json.versionApp > version ) {        
        // запускаємо програму оновлювач
        startExecutable();
        // // і закриваємо поточну програму для коректного її оновлення
        // app.quit();

    }
}


// Function to start the executable file (запуск exe файлу програми файлу оновлювача)
function startExecutable() {
    // const checkDir = path.join(directoryPath, 'updator.exe');

    const exePath = path.join(directoryPath, 'updator.exe');

    const options = {
        shell: true, 
        // створюємо процес, відокремлений від батьківського процесу NodeJs
        detached: true, //!! ОБОВ'ЯЗКОВО має бути true, бо не буде працювати оновлювач при закриті порталу
        // Ігноруємо стандартні потоки, щоб забезпечити повну незалежність
        stdio: 'ignore'
    }

    const child = spawn(exePath, [], options);
    // відєднує дочірний процес від батьківсього процесу, дозволяючи батьківсьокому процесу завершитися без очікування завершеня дочірнього процесу
    child.unref();

    // і закриваємо поточну програму для коректного її оновлення
    app.quit();
}





// перевірка наявності оновлення додатку
async function checkUpdates() {
    const updateInfo = await fetch(`${config.SERVER_URL}/updates-info`, {
        method: "GET",

    }).then( (res) => {
        // Дістаємо дані у форматі json
        return res.json()
    })

    // Робимо перевірку чи наша версія додатку є меншою ніж в оновленні
    if(updateInfo.versionApp && !(updateInfo.versionApp > app.getVersion())) {
        // Кажемо що не треба запускати процес оновлення
        return false

        // Якщо нема такого ключа в даних для оновлення то нічого не маємо запускати, бо можемо просто видалити поточну версію
    } else if (!updateInfo.versionApp) {
        // Кажемо що не треба запускати процес оновлення
        return false
    }

    // шлях до папки updator (програми оновлення)
    const pathToUpdator = path.join(config.getRootPath(), directoryName)

    // Перевіряємо чи існує у проекті папка з програмою для оновлення
    if(fs.existsSync(pathToUpdator)) {
        try {
            // Зчитуємо інформацію про програму оновлювач
            const updatorData = fs.readFileSync(path.join(pathToUpdator, "resources/app.asar/package.json"))

            // Дістаємо версію програми оновлювача
            const versionUpdator = (JSON.parse(updatorData)).version

            // Перевіряємо чи версія оновлювача не стара (чи на сервері нема нової версії порівняно з нашою на пк)
            if (updateInfo.versionUpdator && updateInfo.versionUpdator > versionUpdator && updateInfo.linkUpdator) {
                // Видаляємо всі старі дані програми оновлючава
                await deleteFolderRecursive(pathToUpdator)

                // скачуємо оновлену версію updator в її ж папку
                await downloadAndExtractUpdate(updateInfo, "linkUpdator", pathToUpdator)

                return true
            }

        } catch (error) {
            // Видаляємо всі старі дані програми оновлючава
            await deleteFolderRecursive(pathToUpdator)

            // скачуємо оновлену версію updator в її ж папку
            await downloadAndExtractUpdate(updateInfo, "linkUpdator", pathToUpdator)

            return true
        }

    } else {
        // створюємо папку
        fs.mkdirSync(pathToUpdator);

        // скачуємо оновлену версію updator в її ж папку
        await downloadAndExtractUpdate(updateInfo, "linkUpdator", pathToUpdator)

        return true
    }
    
    // // запускаємо програму оновлювач, яку ми маємо (для оновлення поточної програми)
    // startExecutable();

    // // Закриваємо поточну програму для коректного її оновлення
    // app.quit();

    checkVersion(updateInfo)

    // Вертаємо повідомлення, що оновлювати наш додаток потрібно
    return true
}





// <=========================== in updator =======================>
const { Readable } = require("stream");
const AdmZip = require('adm-zip');


function deleteFolderRecursive(directoryPath, excludeFolder = "") {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath)
        .filter((file) => file !== excludeFolder) // Exclude the specified folder
        .forEach((file) => {
            const curPath = path.join(directoryPath, file);
            
            // якщо це файл з розшмренням asar то відразу його видалаяємо
            if (curPath.split(path.sep).pop().split(".").pop() === "asar") {
                try {
                    fs.unlinkSync(curPath);
                } catch (error) {
                    //
                }
                return
            }

            // робимо перевірку чи є поточний шлях є папкою
            if (fs.lstatSync(curPath).isDirectory()) {
                // рекурсивно запускаємо себеж
                deleteFolderRecursive(curPath, excludeFolder);
                
                // якщо папка пуста то видаляємо її
                if (fs.readdirSync(curPath).length === 0) {
                    fs.rmdirSync(curPath);
                } 

            } else {

                try {
                    fs.unlinkSync(curPath);
                } catch (error) {
                    //
                }
            }
        });
    }
};



// Function to download and extract the update zip project
async function downloadAndExtractUpdate(json, key, updateFolder) {
    const zipFilePath = path.join(updateFolder, 'update.zip');
    
    // Download the update zip project from the provided URL
    const fetchZIP = await fetch(json[key])

    // Readable.fromWeb(fetchZIP.body)
    fetchZIP.body.pipe(fs.createWriteStream(zipFilePath))
    .on('close', async () => {
        // Extract the downloaded zip file
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(updateFolder, true);
        
        // Delete the downloaded zip file
        fs.unlinkSync(zipFilePath);

        // запускаємо перевірку чи треба оновлювати даний додаток (портал), якщо треба оновлюємо
        checkVersion(json)

        // // Run Portal
        // const child = spawn(path.join(zipFilePath, "../electronupdt.exe"), [], { detached: true, stdio: 'ignore' });
        // child.unref();

        // // Exit app
        // app.quit()
    });
}





module.exports = {
    checkUpdates,

}


// 8888 -lowDB
const config = require("../config/config")
const path = require("path")
const fs = require("fs")
const lowDb = require("lowdb")
const FileSync = require("lowdb/adapters/FileSync")


class LocalDataBase {
    constructor() {
        this.localDB = ""
    }


    // <===================================================================>
    createLocalDB(){
        // шлях до файлу логів
        const pathLocalDB = path.join(config.getLoadFolder(""), config.NAME_FILE_LOCAL_DB)

        try {
            // зчитуємо дані для перевірки чи вони правильної структури
            const data = JSON.parse(fs.readFileSync(pathLocalDB, "utf8"))

            // якщо у файлі не обєкт тоді переписуємо його
            if (typeof data !== "object" || Array.isArray(data)){
                fs.writeFileSync(pathLocalDB, JSON.stringify({}))
            }

        } catch (error) {
           //
        }
        

        // ініціалізуємо базу даних
        this.localDB = lowDb(new FileSync(pathLocalDB))

        // накидуємо дефолтний шаблон
        // this.localDB.defaults({}).write()
        
    }


    // <====================================================================>
    getCurrentDataTime(date = new Date()) {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        const hours = String(date.getHours()).padStart(2, "0")
        const minutes = String(date.getMinutes()).padStart(2, "0")
        const seconds = String(date.getSeconds()).padStart(2, "0")

        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`
    }


    // можливо слід переписати даний шаблон 
    async writeToDB(key, value = {}) {
        const existingEntry = this.localDB.get(key).value()
        const now = new Date()
        
        if (existingEntry) {
            const maxID = Math.max(...existingEntry.map( (existingEntry) => existingEntry.id), 0) + 1
            this.localDB.get(key).push({id: maxID, dateTS: now, date: this.getCurrentDataTime(now), value}).write()

        } else {
            this.localDB.set(key, [{id: 1, dateTS: now, date: this.getCurrentDataTime(now), value}]).write()
        }

    }


    // записуємо інформацію про скачані додатки
    writeLoadedApp(key, value = {}) {
        // перевіряємо чи існує такий ключ
        const existingEntry = this.localDB.get(key).value()

        if (existingEntry) {
            // перевіряємо чи є вже такий запис з такими даними
            const data = this.localDB.get(key).find( (item) => { return item.idApp === value.idApp}).value()
            if (data) {
                // якщо є просто оновлюємо його
                this.localDB.get(key).find( (item) => { return item.idApp === value.idApp}).assign(value).write()

            } else {
                // додаємо новий запис
                this.localDB.get(key).push(value).write()
            }


        } else {
            // якшо не існує такого ключа створюємо його
            this.localDB.set(key, [value]).write()
        }
    }


    // перевіряємо чи треба оновлювати і записуємо(оновлюємо) інформацію про скачані додатки
    checkRunUpdateForApp(key, value = {}) {
        // перевіряємо чи існує такий ключ
        const existingEntry = this.localDB.get(key).value()

        // якщо такого ключа не існує, свторюємо його і треба оновити(завантажити)
        if(!existingEntry){
            this.localDB.set(key, [value]).write()

            return true
        }

        // шукаємо запис з відповідними даними
        const data = this.localDB.read().get(key).find( (item) => { return item.idApp === value.idApp && item.idDoc === value.idDoc}).value()

        // якщо такого запису нема, тоді його додаємо(записуємо) і треба оновити(завантажити)
        if (!data) {
            // додаємо новий запис (записуємо інформацію)
            this.localDB.get(key).push(value).write()

            return true
        }

        // Перевіряємо по версії додатку треба оновлювати чи ні
        if (value.versionApp !== data.versionApp) {
            // оновлюємо його дані у файлі
            this.localDB.get(key).find( (item) => { return item.idApp === value.idApp}).assign(value).write()

            return true
        }


        // не потрібно оновлювати
        return false
    }

}



module.exports = new LocalDataBase()



// 9999 -generate cmd

const config = require("../config/config")
const { shell } = require('electron/main')
const { exec, execFile, spawn, fork } = require('node:child_process');
const path = require('path')


// відкриваємо браузер по дефолту в системі з переданим url (Обов'язково має бути url браузера, ато буде відкриватися провідник)
async function openWebApp (urlWebApp) {
    // Запускаємо вбудований браузер з вказаним URL
    shell.openExternal(urlWebApp);
}


// Формуємо cmd скрипт для запуску дестопних додатків (відкритя файлів) і запускаємо по ньому додаток через cmd рядок
async function runCMDScriptForDescApp (pathToDirDownloadApp, taskInfo = {}, nameFile = "") {
    
    //!     login - має бути без кавичок для наступних прикладів(незалежно чи це кирилиця чи латинеця)
    //!    \""login"\"@SAL/password
    //!     ifrun60.exe askid.fmx  '\""login"\"@SAL/\"password\"'
    //!     ""  name.exe  '\""login"\"@tnsServer/\"password\"'

    const options = {
        encoding: "utf-8",
        shell: true, //"cmd.exe",
        windowsHide: true,
        //
        detached: false, //! без false - на windows11 буде відкривати додатки на задньому фоні
        stdio: 'ignore'
    }

    // переходимо у папку де знаходиться додаток(файл) який треба запустити
    const dirForRunApp = "cd" + " " + "\"" + pathToDirDownloadApp + "\""

    // додаток(файл) через який запускається повноціний інший додаток, якщо він необхідний
    let fileToRunApp = ""
    // додатковий додаток(файл) який запускає інші додатки, його беремо якщо в базі вказано add_file 
    if (taskInfo["EXE_FILE"] && taskInfo["ADD_FILE"]) {
        fileToRunApp = "\"" + taskInfo["EXE_FILE"] + "\""   //  "ifrun60.exe"
    }


    // абсолютний шлях з файлом який треба запустити
    let nameApp = ""
    // запуск якогось файла з системи, без додатковий вимог (відео, мануали.....)
    if (nameFile.length > 0) {
        nameApp = "\"" + path.join(pathToDirDownloadApp, nameFile) + "\""  //  "path\nameFile..."
    
        // запускаємо формсові додатки (загальний шаблон не підходить бо ifran60.exe не хоче приймати шлях до файла з пробелами навіть в "", тому передаємо лише назву файла який запускаємо)
    } else if (taskInfo["EXE_FILE"] && taskInfo["ADD_FILE"]) {
        nameApp = "\"" + /*path.join(pathToDirDownloadApp,*/ taskInfo["ADD_FILE"]/*)*/ + "\""  // "path\askid.fmx"

        // запускаємо файли, які не мають додатковий файлів (зоро, .bat файли, .exe .....)
    } else if (taskInfo["EXE_FILE"] && !taskInfo["ADD_FILE"]) {
        nameApp = "\"" + path.join(pathToDirDownloadApp, taskInfo["EXE_FILE"]) + "\""  // "path\exe_file.exe"
    }

    // параметри, які ми передаємо у запускаємий додаток
    const appServer = "@" + config.tnsServer


    let userDataAndServer = ""
    // робимо перевірку чи починається і закінчується логін кавичками
    let login = config.loginUser
    if (!/^".*"$/.test(config.loginUser)) {
        login = `"${config.loginUser}"`  // '"' + config.loginUser + '"'
    }

    if (!nameFile) {
        userDataAndServer = '\\"' + login + '\\"' + appServer + '/' + '\"' + config.passwordUser + '\"'
    }
   

    // "cd path_to_file" && "additional_app" + "path\run_file" + userData
    const command = dirForRunApp + " && " + fileToRunApp + " " + nameApp + " " + userDataAndServer
    // console.log(command)


    // запускаємо cmd з рядком command і налаштуванями options
    const cmd = spawn(command, options, (err, data) => {
        if(err){
            // console.log(`Error ----> `, err);
            return;
        }
    
        // console.log(`Data ---> `, data);
    })

    cmd.unref()
}


module.exports = {
    openWebApp,
    runCMDScriptForDescApp,
}

// 121212 -downlandrun

const config = require("../config/config")
const path = require('path')
// const dataAvailable = require("./fileAvailableData")
const hash = require("./getHashFolderAndFiles")
const saveFiles = require("./SaveFiles")
const generAndRunCmdScripts = require("./generAndRunCmdScript")
const lowDB = require("./lowDB")
// для windwows 7, 8, 8.1 для новіших не треба
const fetch = require("node-fetch");


class DonwloadAndRunFiles {

    //! збереження дексктопних додатків і їх запуск
    async runDesctopApp (token, idApp, nameApp, pathApp, appExeFile, appAddFile, versionApp, forcedLoad, dataFiles) {
        //! Чи потрібно змінювати (обовязково завантажувати всі файли заново при -> true)
        let change = forcedLoad

        // примірник що ми маємо зберегти у файлі для контролю доступних додатків
        const dataApp = {
            idApp: idApp,
            nameApp: nameApp,
            idDoc: "",
            pathApp: pathApp,
            EXE_FILE: appExeFile,
            ADD_FILE: appAddFile,
            versionApp: versionApp,
        }


        try {
            // якщо стоїть примусове завантаження просто оновлюємо дані у файлі доступності дані остані дані, інакше дивимося чи потрібно проводити оновлення по файлу доступності
            if (change) {
                // зберігаємо інформацію про скачані файли у файл доступності на пк користувача
                lowDB.checkRunUpdateForApp("loaded_app", dataApp)

            } else {
                change = lowDB.checkRunUpdateForApp("loaded_app", dataApp)
            }
           
        } catch (err) {
            //
        }


        // чи треба завантажити(оновлювати) додаток на пк клієнта
        if (change) {
            // шлях де будемо зберігати(має знаходитися) додаток
            // const pathToDirDownloadApp = saveFiles.getPathToDir(pathApp)
            const pathToDirDownloadApp = config.getLoadFolder(pathApp)

            // отримуємо хеш фалів => [{},{}], які знаходяться по вказаному path
            const hashData = await hash.getHashForAllFilesInFolder(pathToDirDownloadApp, "sha256")
            
            // робимо ajax запит до API, щоб завантадити додаток, або його оновити відповдіно до hash
            const appData = await fetch(config.API_URL + '/api/v1/portal/tasks/' + idApp + "/downloads", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(hashData),
            })
            const data = await appData.json()

            try {
                // зберігємо на комютері дані, які прилетіли одним json файлом з API (є проблеми з .exe вони після цього не хочуть запускатися)
                await saveFiles.saveFilesFromJSON(pathToDirDownloadApp, data, dataApp)

            } catch (error) {
                //
            }

            // запускаємо додаток, через генерацію cmd скрипта і його виконання
            generAndRunCmdScripts.runCMDScriptForDescApp(pathToDirDownloadApp, dataApp)

        } else {

            // шлях де будемо зберігати(має знаходитися) додаток
            // const pathToDirDownloadApp = saveFiles.getPathToDir(pathApp)
            const pathToDirDownloadApp = config.getLoadFolder(pathApp)

            // запускаємо додаток, через генерацію cmd скрипта і його виконання
            generAndRunCmdScripts.runCMDScriptForDescApp(pathToDirDownloadApp, dataApp)
        }
    }


    //! збереження мануалів і їх відкриття(запуск)
    async openManual (token, idApp, idDoc, pathApp, docFileName, versionFile, forcedLoad, data) {
        //! Чи потрібно змінювати (обовязково завантажувати всі файли заново при -> true)
        let change = forcedLoad

        // примірник що ми маємо зберегти у файлі для контролю доступних мануалів
        const dataApp = {
            idApp: idApp,
            nameApp: docFileName,
            idDoc: idDoc,
            pathApp: pathApp,
            EXE_FILE: "",
            ADD_FILE: "",
            versionApp: versionFile,
        }


        try {
            // якщо стоїть примусове завантаження просто оновлюємо дані у файлі доступності дані остані дані, інакше дивимося чи потрібно проводити оновлення по файлу доступності
            if (change) {
                // зберігаємо інформацію про скачані файли у файл доступності на пк користувача
                lowDB.checkRunUpdateForApp("Manuals", dataApp)

            } else {
                change = lowDB.checkRunUpdateForApp("Manuals", dataApp)
            }
           
        } catch (err) {
            //
        }

        
        if (change) {
            // шлях де будемо зберігати(має знаходитися) додаток
            // const pathToDirDownloadApp = saveFiles.getPathToDir(pathApp)
            const pathToDirDownloadApp = config.getLoadFolder(pathApp)

            // до шляху додатку ми додаємо підпапку, куди будеом зберігати -- інструкції
            const pathToDirDownloadAppDocuments = path.join(pathToDirDownloadApp, "Manuals")

            // створюємо папки поки не буде існуючий path
            saveFiles.createDirectoriesRecursively(pathToDirDownloadAppDocuments)
            
            // робимо ajax запит до API, щоб завантадити конкретну інструкцію, або їх оновити відповдіно до hash
            const appData = await fetch(config.API_URL + '/api/v1/portal/tasks/manuals/' + idDoc + '/downloads', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })
            const data = await appData.json()


            try {
                // зберігємо на комютері дані, які прилетіли одним json файлом з API
                await saveFiles.saveFilesFromJSON(pathToDirDownloadAppDocuments, data, dataApp)

            } catch (error) {
                //
            }

            // запускаємо генерацію cmd скрипта і його виконання, щоб відкрити -- інструкцію через cmd (різні файли, відео...)
            generAndRunCmdScripts.runCMDScriptForDescApp(pathToDirDownloadAppDocuments, {}, dataApp.nameApp)

        } else {
            // шлях де будемо зберігати(має знаходитися) додаток
            // const pathToDirDownloadApp = saveFiles.getPathToDir(pathApp)
            const pathToDirDownloadApp = config.getLoadFolder(pathApp)

            // до шляху додатку ми додаємо підпапку, куди будеом зберігати -- інструкції
            const pathToDirDownloadAppDocuments = path.join(pathToDirDownloadApp, "Manuals")

            // запускаємо генерацію cmd скрипта і його виконання, щоб відкрити -- інструкцію через cmd (різні файли, відео...)
            generAndRunCmdScripts.runCMDScriptForDescApp(pathToDirDownloadAppDocuments, {}, dataApp.nameApp)
        }

    }
    
}



module.exports = new DonwloadAndRunFiles()

// module.exports = {
//     runDesctopApp,
//     // openManual,
// }


// 1313 - main

const { app, BrowserWindow, ipcMain, session, autoUpdater, dialog } = require('electron');
const path = require('path');
const os = require("os")
const config = require("./config/config")

const customTray = require("./scripts/customTray")
const downloadAndRun = require("./scripts/downloadAndRun")
const saveFiles = require("./scripts/SaveFiles")
const generAndRunCmdScripts = require("./scripts/generAndRunCmdScript")
const regedit = require("./scripts/regedit")

// Локальна база даних
const localDB = require("./scripts/lowDB")

// Для роботи з AutoStart
const AutoLaunch = require('auto-launch');

// скріпти власного оновлення додатку
const updateScript = require("./scripts/update")



//! <===========================================================================================>
//! <==========================> IGNORE SSL SERTIFICATE <=======================================>
//! <===========================================================================================>
global.process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'; 

app.commandLine.appendSwitch('ignore-certificate-errors', true);


app.disableHardwareAcceleration()  // https://www.electronjs.org/ru/docs/latest/tutorial/offscreen-rendering

//! <===========================================================================================>
//! <===============================> AUTO UPDATE <=============================================>
//! <===========================================================================================>

// const server = 'file:///'
// const url = `${path.join(config.getRootPath(),"resources/temp")}`

// console.log(url)

// autoUpdater.setFeedURL(url)
// autoUpdater.checkForUpdates()
// setInterval(() => {
//     autoUpdater.checkForUpdates()
// }, 60000)


// autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
//     const dialogOpts = {
//       type: 'info',
//       buttons: ['Restart', 'Later'],
//       title: 'Application Update',
//       message: process.platform === 'win32' ? releaseNotes : releaseName,
//       detail:
//         'A new version has been downloaded. Restart the application to apply the updates.'
//     }
  
//     dialog.showMessageBox(dialogOpts).then((returnValue) => {
//       if (returnValue.response === 0) autoUpdater.quitAndInstall()
//     })
// })


//! <========================================   Додавання/видалення додатку з AutoStart    =======================================================>
const autoLaunch = new AutoLaunch({
    name: "Portal",
    path: app.getPath("exe")
})


//* Включити/виключити автозапуск додадку з системою
ipcMain.handle("setAutoLaunch", async (event, flag = false) => {
    const isAutoLaunch = await autoLaunch.isEnabled()

    // Перевіряємо чи треба додавати додаток в автозапуск
    if (flag) {
        // Якщо нема в автозапуску
        if (!isAutoLaunch) {
            // додаємо до автозапуску
            autoLaunch.enable();
        }

    } else {
        // Якщо є в автозапуску
        if (isAutoLaunch) {
            // видаляємо з автозапуску
            autoLaunch.disable();
        }
    }

    // Вертаємо результат чи включений автозапуск
    return await autoLaunch.isEnabled()

})






//! <========================================   Власний процес оновлення додатку    =======================================================>
// зчитуємо поточну версію додатку
// const versionApp = app.getVersion()



//* запускаємо власну функуцію, перевірки оновлення додатку
//!!!! ЗАВЖДИ ПЕРЕД ЗБОРКОЮ ТРЕБА РОЗКОМЕНТУВАТИ ВНУТРІШНЮ ЧАСТИНУ ФУНКЦІЇ ОНОВЛЕННЯ
ipcMain.handle("runUpdate", async (event) => {
    // // робимо перевірку на якому пк ми працюємо термінальному чи звичайному
    // const isTerminalServer = await regedit.isTerminalServer(config.REGEDIT_PATH)

    // // запускаємо авто оновлення лише коли додаток знаходиться не на термінальному сервері
    // if (!isTerminalServer) {
    //     // запускаємо скрипт оновлення
    //     const isUpdate = await updateScript.checkUpdates()

    //     // вертаємо повідомлення, що потрібно оновититися
    //     if (isUpdate) {
    //         return true
    //     } 
    // }
    
    // // вертаємо повідомлення, що не потрібно оновлюватися
    // return false
})



// let versions = {};
// versions.nodejs = process.versions.node;
// versions.chrome = process.versions.chrome;
// versions.electron = process.versions.electron;
// console.log(versions)


//! <===========================================================================================>
//! <===============================> GLOBAL VARIABLES <========================================>
//! <===========================================================================================>


let mainWindow = null



//! <===========================================================================================>
//! <===============================> SINGLE INSTANCE  <========================================> https://www.electronjs.org/docs/latest/api/app#apprequestsingleinstancelockadditionaldata
//! <===========================================================================================>
// const additionalData = {myKey: "myVal"}

// Пробуємо отримати блокування, для додатку (якщо ми отримали false - це може свідчити що інший екземпляр програми вже запущений)
const gotTheLock = app.requestSingleInstanceLock()


// Закриваємо якщо це не основний екземляр
if (!gotTheLock) {
    // закриваємо не основні екземпляри, які пробують запуститися при запущеному додатку (основному)
    app.quit()

} else {
    // очікуємо сигналу від інших екземплярів що іх пробували запустити, але дана програма вже є запущеною на пк
    // і ми говоримо які дію мають відбутися в уже основній запущенній програмі
    app.on('second-instance', () => {
        if (mainWindow) {
            if (!mainWindow.isVisible()){
                mainWindow.show()
            }

            mainWindow.focus()
        }
    })

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.on('ready', createWindow);
}


//! <===========================================================================================>
//! <===================================> ELECTRON APP <========================================>
//! <===========================================================================================>
// функція очищення всіх даних які були збереженні (сесія, куки ...)
async function clearStorageSession() {
    await session.defaultSession.clearStorageData({})
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (require('electron-squirrel-startup')) {
//     app.quit();
// }


async function createWindow() {
    //! запускаємо процес очищення сесії, щоб новий запуск був новим(пустим, якщо прибрати то якщо людина вийшла некорекно підтягнеться її сесія)
    await clearStorageSession()

    //* Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1200,
        minWidth: 1000,
        height: 800,
        minHeight: 600,
        // frame: false, // забирає рамки у вікна і все що на них є
        icon: config.PATH_ICO,
        alwaysOnTop: false,

        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: true,
        },
    });

    mainWindow.webContents.setFrameRate(60)

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    //* ХОВАЄМО ВЕРХНЮ ПАНЕЛЬ МЕНЮ -- hide menu bar
    mainWindow.setMenuBarVisibility(false)
    mainWindow.setMenu(null); 

    // and load the index.html of the app.
    // mainWindow.loadFile(path.join(__dirname, 'index.html'));

    //* ВІДКРИВАЄМО У ВІКНІ САЙТ ПО ЙОГО URL
    mainWindow.loadURL(config.SERVER_URL) // config.SERVER_URL

    //* СТВОРЮЄМО ТРЕЙ ДЛЯ ДОДАТКУ З ЕЛЕМЕНТІВ
    customTray.createTray(mainWindow)

    
    mainWindow.setVisibleOnAllWorkspaces(true)
    mainWindow.setAlwaysOnTop(true)
    mainWindow.show()
    mainWindow.setAlwaysOnTop(false)


    // відслідковування помилки не завантаження сторінки
    mainWindow.webContents.on("did-fail-load", handleLoadError)


    //! Якщо користувач пробує згорнути вікно, то ховаємо його в трей
    mainWindow.on("minimize", () => {    
        // якщо вікно видемме то ховаємо його і навпаки
        if (mainWindow.isVisible()) {
            mainWindow.hide()
        }
    })


    //! обробляємо подію (коли вікно зберається закритися, обов'язково так інакше не встигається спрацювати запит на рендер на логаут)
    let closing = false
    mainWindow.on("close", async (event) => {
        if (!closing) {
            // виклюєчо дефолну поведінку функціоналу, однарозово(лише коли зустріли цю команду)
            event.preventDefault()
            // кажимо що наступний раз треба дісйно його закрити як і мало бути спочатку, до наших модифікацій
            closing = true
            // подаємо сигнал на клієнт про розлогінення
            mainWindow.webContents.send("exitFromElectron", "true")
            // робимо затримку щоб все стигло відпрацювати
            setTimeout(() => {
                app.quit()
            }, 500)
        }
    })
    

    //! <====================== Пробуємо якось захиситит від глюків в рендер процесі (не виходить) ===================>

    // mainWindow.webContents.on("focus", () => {
    //     console.log(mainWindow.webContents.isCrashed())
    //     if (mainWindow.webContents.isCrashed()) {
    //         mainWindow.webContents.reloadIgnoringCache()
    //     }
    // })

    // mainWindow.webContents.on("render-process-gone", (event, killed) => {
    //     console.log(event, killed)
    // });

};

async function handleLoadError(event, errorCode, errorDescription, validateURL, isMainFrame) {
    // console.error("Failed to load URL:", validateURL)
    // console.error("Error code:", errorCode)
    // console.error("Error description:", errorDescription)


    // Відкриваємо локальну сторінку, при пропажі підключення до інтернету
    mainWindow.loadURL(`file:///${path.join(__dirname, "../src/static/error.html")}`)
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// app.on('ready', createWindow);


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
    //! запускаємо процес очещення сесії, щоб новий запуск був новим(пустим, якщо прибрати то якщо людина вийшла некорекно підтягнеться її сесія)
    await clearStorageSession()

    if (process.platform !== 'darwin') {
        app.quit();
    }
});


app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
//! <===========================================================================================>
//! <===========================> ADD NEW FUNCTIONS ON ELECTRON APP <===========================>
//! <===========================================================================================>


//* Отримати зміні з electrona на render
ipcMain.handle("getData", async (event) => {
    // обєкт з даними, які ми будемо відправляти на render при його запиті
    const data = {
        // OS
        osArch: os.arch(),
        osHostname: os.hostname(),
        osPlatform: os.platform(),
        osVersion:os.version(),
        // App
        appVersion: app.getVersion(),
        // My
        isTerminalServer: config.isTerminalServer,
        login: config.loginUser,
        tns: config.tnsServer,

        isAutoLaunch: await autoLaunch.isEnabled()
    }

    return data
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>



//* Отримати поточну версію додатку
ipcMain.handle("getVersionApp", async (event) => {
    return app.getVersion()
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>


//* Зберігаємо дані для користування з фронта тут
ipcMain.handle("saveUserData", async (event, login, password, tns) => {
    config.loginUser = login
    config.passwordUser = password
    config.tnsServer = "TEST10"

    // пишемо дані про користувача в реєст
    await regedit.saveUsers(login)

    // робимо перевірку на якому пк ми працюємо термінальному чи звичайному
    await regedit.isTerminalServer(config.REGEDIT_PATH)

    // зберігаємо у реєстр шлях до папки куди будуть скачуватися модулі(додатки) - new - portal
    await regedit.savePathFolderDownloadApp(saveFiles.getPathToDir(""))

    // зберігаємо у реєстр шлях до папки куди будуть скачуватися модулі(додатки) - old - loader_form (обовязково має бути + "\\" бо старий лоадер обєднує рядки без \ і це помилки сипить)
    await regedit.saveOldPath(saveFiles.getPathToDir("") + "\\", config.REGEDIT_PATH_LF)


    // створюємо локальну базу
    localDB.createLocalDB()

    // Чистимо гілки в локільній базі 
    localDB.localDB.unset("updates").write()
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>
//* Відловлюємо сигнал розлогінення користувача і вертаємо шаблон трея до дефолту
ipcMain.handle("logoutUser", async (event) => {
    // затираємо дані про користувача(логін, пароль, tns)
    config.loginUser = null
    config.passwordUser = null
    config.tnsServer = null

    // показуємо вікно, що треба зайти, якщо воно сховане в треї
    if (!mainWindow.isVisible()) {
        mainWindow.show()
    }
   
    // запускаємо перегенерення трея на дефольт (робимо його пустим)
    await customTray.setDefaultMenuTray()

    // при виході користувача чистимо всі сховища, щоб при новому наступному підключеня все було з чистого, якщо корисувач не закриває додаток
    await clearStorageSession()
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>

//* видалити логін користувача з реєстра підказок
ipcMain.handle("deleteUser", async (event, login) => {
    // запускаємо процес видалення користувача з відповідним login
    await regedit.deleteUser(login)
    // Вертаємо підтвредження що ми його видалили
    return true
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>
//* відправляємо дані про користувача на RENDER
ipcMain.handle("getUsers", async (event) => {
   
    //* ОТРИМУЄМО ЛОГІНИ КОРИСТУВАЧІВ ЗБЕРЕЖЕНИХ У РЕЄСТРІ І ВІДПРАВЛЯЄМО НА RENDER
    const users = await regedit.getUsers()
    return users

})

//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>

//* отримати всі логи з файла
ipcMain.handle("getAllLog", async (event) => {
    
    try {
        // зчитуємо всю локальну базу (заново перечитуючи її з файла)
        const dataLog = localDB.localDB.value()

        // вертаємо дані у відповідь до запиту
        return dataLog

    } catch (error) {
        return {}
    } 
})




//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>

//* Оновлення вмісту трея
ipcMain.handle("updateTrayMenu", async (event, dataListApp) => {
    customTray.setMenuTray(dataListApp)
})

//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>

//* Завантаження(оновлення) і Запуск десктопних додатків на комютері користувача
ipcMain.handle("runDesktopApp", async (event, token, idApp, nameApp, pathApp, appExeFile, appAddFile, versionApp = "", forcedLoad = true, data = []) => {
    // запускаємо процес збереження і запуск додатку
    // console.log(idApp, nameApp, pathApp, appExeFile, appAddFile, versionApp, forcedLoad, data)
    
    await downloadAndRun.runDesctopApp(token, idApp, nameApp, pathApp, appExeFile, appAddFile, versionApp, forcedLoad, data)

    return true
})



//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>


//* Завантаження(оновлення) і Відкриття мануалів на пк через cmd
ipcMain.handle("openDocument", async (event, token, idApp, idDoc, pathApp, docFileName, versionFile = "", forcedLoad = true, data = []) => {
    // запускаємо процес збереження і відкриття мануала (інструкції)
    // console.log(idApp, idDoc, pathApp, docFileName, versionFile, forcedLoad, data)
    await downloadAndRun.openManual(token, idApp, idDoc, pathApp, docFileName, versionFile, forcedLoad, data)

    return true
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>

//* робимо перевірку, якщо вікно видемо ховаємо його
ipcMain.handle("hideWindow", async (event) => {
    // показуємо вікно, що треба зайти, якщо воно сховане в треї
    if (mainWindow.isVisible()) {
        mainWindow.hide()
    }
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>


//* робимо перевірку, якщо вікно сховане показуємо його
ipcMain.handle("showWindow", async (event) => {
    if (!mainWindow.isVisible()) {
        mainWindow.show()
    }
})


//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>



//* Потокове завантаження додатків і подальший їх запуск
ipcMain.handle("runDesktopAppStream", async (event, taskInfo) => {
    // const taskInfo = data
    // console.log(taskInfo)
    
    const pathToDirDownloadApp = downloadFiles.getPathToDir(taskInfo["PATH_APP"])
    // console.log(pathToDirDownloadApp)

    // Крок 1: починаємо завантаження fetch, отримуємо потік для зчитування
    const fechData = await fetch(URL_API_SERVER + "/api/v1/streamDownloads/" + taskInfo["ID"], {
        method: "GET",
    })

    const reader = fechData.body.getReader();
    const decoder = new TextDecoder("utf-8")

    // збергіємо дані між чанками (загальний результат)
    let chunks = ""

    // опрацьовуємо кожен чанк поки не завершиться потік даних
    while (true) {

        const { done, value } = await reader.read()

        if (done) {
            console.log("Stream end")
            break
        }

        const text = decoder.decode(value, {stream: !done})
        // console.log(text)

        // додаємо отриманий чанк до загального результату
        chunks += text
        // console.log(chunks)
        // console.log(">>>>>>", chunks.split("\n"))

        // шукаємо відокремлені дані, якщо є отримуємо назад масив з ними
        const object = chunks.split("\n")
        // console.log(object)

        // перевіряємо чи є у масиві повноціний обєкт, з даних чанка
        if (object.length > 1) {
            chunks = object.pop()
            // console.log("OBJ>>", object)

            object.forEach( (objString) => {
                // console.log(objString)
                
                //! Обов'язково має бути тут бо треба перевірити чи є повноціні обєкти перед тим як його діставати (парсити дані)
                if (objString.trim() !== "") {
                    const objectData = JSON.parse(objString)
                    // console.log(Buffer.from(object.blob, "base64"))

                    // console.log("OBJ_DATA>>", objectData)
                    // console.log("\n\n")

                    
                    // перевіряємо чи не отримали випадково blob == null
                    if (objectData.blobFile !== null) {

                        const filePath = path.join(pathToDirDownloadApp, objectData.nameFile)
                
                        const blobData = Buffer.from(objectData.blobFile, "base64")

                        fs.writeFile(filePath, blobData, (err) => {
                            if (err) {
                                console.error(`Error saving ${objectData.nameFile}:`, err)
                            }
                        })

                        // fs.appendFile(path.join("D:", "log.txt"), `Create or update file: ${filePath}\n`, () => {})
                        // console.log(`Create or update file: ${filePath}`)
                    }

                }
            })
            
        } else {
            chunks = object[0]
            // console.log("!!!!!!!!!>", chunks)
        }
        // console.log("-------->", chunks)

    
        // const object = JSON.parse(value)
        // console.log(object)
        // console.log("-!-!-!-!\n\n")
    }


    runCMDScriptForDescApp(pathToDirDownloadApp, taskInfo)
})



//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>


//  Запуск загальний веб додатків через cmd в браузері по дефолту
ipcMain.handle("runWebApp", async (event, urlData) => {
    // Запускаємо вбудований браузер з вказаним URL
    generAndRunCmdScripts.openWebApp(urlData)
})

//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>




//? <=========================================================================================================================>
//? <=========================================================================================================================>
//? <=========================================================================================================================>



// 14141414 -- preload

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
const { contextBridge, ipcRenderer } = require('electron/renderer')


//!  Створюмємо міст з глобальною назвою "window.electronAPI" для взаємодії між процесам main і render
contextBridge.exposeInMainWorld('electronAPI', {

    //* <===========================> З render процес до main процес <===========================>

    // запускаємо перевірку, якщо вікно сховане показуємо його
    showWindow: () => ipcRenderer.invoke("showWindow"),

    // запускаємо перевірку, якщо вікно видиме ховаємо його
    hideWindow: () => ipcRenderer.invoke("hideWindow"),

    // зберігаємо дані авторизації (логін, пароль, tns) при успішній авторизації користувачі
    saveUserData: (login, password, tns) => ipcRenderer.invoke("saveUserData", login, password, tns),

    // розлогінення користувача (видалення даних з авторизація і перегенерення трея на дефолтний без доступних додатків)
    logoutUser: () => ipcRenderer.invoke("logoutUser"),

    // отримати користувачі з реєстра комютера клієнта
    getUsers: () => ipcRenderer.invoke("getUsers"),

    // видалити логін користувача з реєстра підказок
    deleteUser: (login) => ipcRenderer.invoke("deleteUser", login),

    // оновлення меню трея
    updateTrayMenu: (dataListApp) => ipcRenderer.invoke("updateTrayMenu", dataListApp),

    // відкривати WEB сторінки
    runWebApp: (dataURl) => ipcRenderer.invoke("runWebApp", dataURl),

    // завантажуємо і запускаємо десктопний додаток
    runDesktopApp: (token, idApp, nameApp, pathApp, appExeFile, appAddFile, versionApp, forcedLoad, data) => ipcRenderer.invoke("runDesktopApp", token, idApp, nameApp, pathApp, appExeFile, appAddFile, versionApp, forcedLoad, data),

    // щоб запустит скріпт відкритаття мануала до додатку
    openDocument: (token, idApp, idDoc, pathApp, docFileName, versionFile, forcedLoad, data) => ipcRenderer.invoke("openDocument", token, idApp, idDoc, pathApp, docFileName, versionFile, forcedLoad, data),

    // робимо перевірку чи потрібно запускати процес оновлення даного додатку (порталу), якщо вертаємо false значить не треба
    runUpdate: () => ipcRenderer.invoke("runUpdate"),

    // отримати набір параметрів з додатку на запит користувача
    getData: () => ipcRenderer.invoke("getData"),

    // отримати версію даного додатку (portal)
    getVersionApp: () => ipcRenderer.invoke("getVersionApp"),

    // отримати всі логи з файла і вернути їх на запит 
    getAllLog: () => ipcRenderer.invoke("getAllLog"),
    
    // встановити параметр автозапуску додатку
    setAutoLaunch: (flag) => ipcRenderer.invoke("setAutoLaunch", flag),


    // тестові
    // getHash: (path) => ipcRenderer.invoke("getHash", path),
    // download: (data) => ipcRenderer.invoke("download", data),
    
    // test -- для запуску додатків після потокового завантаження
    // runDesktopAppStream: (data) => ipcRenderer.invoke("runDesktopAppStream", data),
    
    

    //* <===========================> З main процес до render процес <===========================>
    // посилаємо сигнал для емітування запуску кнопки вийти з main процеса на рендері
    mainCloseElectron: (callback) => ipcRenderer.on("exitFromElectron", (event, value) => callback(value)),

    // посилаємо сигнал для емітування запуску кліку кнопки запуску додатку
    runAppFromMainTray: (callback) => ipcRenderer.on("runAppFromTray", (event, value) => callback(value)), 

})







