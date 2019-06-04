const exec = require('executive');
const fs = require('fs');
const path = require('path');
const reduxActions = require('../state/actions');
const reduxStore = require('../state/store');
const defaultSettings = {
    client: true,
    clientRoot: '/',
    clientBuild: false,
    clientBuildRoot: '/dist',
    server: false,
    serverRoot: '/',
    serverEntry: 'index.js',
    serverPort: '5000',
}

const removeFolder = (appInfo) => {

    //Construct path to folder
    const folderPath = `${__dirname}/../temporary/${appInfo.userId}`;

    //Delete the folder if it already exists
    return exec(`rm -rf ${folderPath}`)

        //Return the appInfo
        .then(() => {
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Removed Folder: ${folderPath}`
            });
            return appInfo;
        })

        //Error deleting temp folder
        .catch((error) => {
            throw new Error('filesystem.removeFolder() >>> ' + error);
        });
}

const cloneRepo = (appInfo) => {

    //Construct path to folder
    const folderPath = `${__dirname}/../temporary/${appInfo.userId}`;

    //Create a temporary user folder
    return exec(`mkdir ${folderPath}`)

        .then(() => {
            //Clone the repo to the user's temporary directory
            return exec(`git clone ${appInfo.repo} ${folderPath}`);
        })

        //Return the appInfo
        .then(() => {
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Repo Cloned: ${appInfo.repo} \n Into: ${folderPath}`
            });
            return appInfo;
        })

        //Error deleting temp folder
        .catch((error) => {
            throw new Error('filesystem.cloneRepo() >>> ' + error);
        });
}

const checkoutBranch = (appInfo) => {

    //Construct path to folder
    const folderPath = `${__dirname}/../temporary/${appInfo.userId}`;

    //Switch to the proper branch
    return exec(`cd ${folderPath} && git checkout ${appInfo.branch}`)

        //Return Debug Document
        .then(() => {
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Switched To Branch: ${appInfo.branch}`
            });
            return appInfo;
        })

        //Error deleting temp folder
        .catch((error) => {
            throw new Error('filesystem.checkoutBranch() >>> ' + error);
        });
}

const parseSettings = (appInfo) => {

    //The first operation is synchronous, so setup a promise to be returned
    return new Promise((resolve, reject) => {

        try {

            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Configuring settings`
            });

            //If there are already settings loaded
            if (appInfo.settings !== undefined) {

                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Found previously configured settings`
                });

                //Store previous settings into app's state 
                appInfo.lastSettings = appInfo.settings;
            }

            //Construct path to folder
            const folderPath = `${__dirname}/../temporary/${appInfo.userId}`;

            //Read the settings file
            fs.readFile(`${folderPath}/.debug`, (error, settings) => {
                if (error !== null) {

                    //If the .debug settings file is non-existent
                    //Then fs.readFileSync will throw an error
                    //Grab the default settings
                    if (error.code === 'ENOENT') {

                        //Insert into logs
                        reduxStore.dispatch({
                            type: reduxActions.ADD_TO_APP_LOG,
                            userId: appInfo.userId,
                            payload: `No .debug Setting File Located`
                        });
                        reduxStore.dispatch({
                            type: reduxActions.ADD_TO_APP_LOG,
                            userId: appInfo.userId,
                            payload: `Loading Default Settings`
                        });

                        //Insert the settings in the state
                        reduxStore.dispatch({
                            type: reduxActions.UPDATE_APP_STATE,
                            userId: appInfo.userId,
                            payload: {
                                defaultSettings
                            }
                        });

                        //Insert the default settings in the appInfo
                        resolve({
                            ...appInfo,
                            defaultSettings
                        });


                        //Else a different error occurred so throw an error
                    } else {
                        reject(new Error('filesystem.parseSettings() @ fs.readFile >>> ' + error));
                    }

                } else {

                    //Convert JSON to a JS Object
                    settings = JSON.parse(settings);

                    //Insert the settings in the log
                    reduxStore.dispatch({
                        type: reduxActions.ADD_TO_APP_LOG,
                        userId: appInfo.userId,
                        payload: `.debug Setting File Located and Parsed`
                    });

                    //Insert the settings in the state
                    reduxStore.dispatch({
                        type: reduxActions.UPDATE_APP_STATE,
                        userId: appInfo.userId,
                        payload: {
                            debugFileSettings: settings
                        }
                    });

                    //Insert .debug file settings into state
                    resolve({
                        ...appInfo,
                        debugFileSettings: settings
                    });
                }

            });

        } catch (error) {
            reject(new Error('filesystem.parseSettings() >>> ' + error));
        }
    });
}

const runBuildTools = (appInfo) => {

    reduxStore.dispatch({
        type: reduxActions.ADD_TO_APP_LOG,
        userId: appInfo.userId,
        payload: `Installing and/or Building Dependencies`
    });

    //See if package-lock.json exists to determine if the project is using NPM or Yarn
    //If package-lock.js does not exist then the project is using yarn
    const npm = fs.existsSync(`${__dirname}/../temporary/${appInfo.userId}/package-lock.json`);

    //Booleans which specify whether there's a build process
    const clientBuild = appInfo.settings.clientBuild;
    const server = appInfo.settings.server;

    //Construct path to client
    let clientFolder = appInfo.userId;
    //If the client root is not / then add the client path
    if (appInfo.settings.clientRoot !== '/') clientFolder += appInfo.settings.clientRoot;

    //Construct path to server
    let serverFolder = appInfo.userId;
    //If the server root is not / then add the server path
    if (appInfo.settings.serverRoot !== '/') serverFolder += appInfo.settings.serverRoot;

    //Deduce package manager
    let packageManager;
    if (npm) packageManager = 'npm';
    else packageManager = 'yarn';

    reduxStore.dispatch({
        type: reduxActions.ADD_TO_APP_LOG,
        userId: appInfo.userId,
        payload: `Package Manager Detected: ${packageManager}`
    });

    //If there's a client build process and a server
    if (clientBuild && server) {

        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId: appInfo.userId,
            payload: `This May Take A While...`
        });

        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId: appInfo.userId,
            payload: `Installing Frontend Dependencies and Building`
        });

        //Change directories and start the client build process
        return exec.quiet(`cd ${__dirname}/../temporary/${clientFolder}/ && ${packageManager} install && ${packageManager} run build`)

            .then(() => {

                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Frontend Dependencies Installed and Built`
                });

                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Installing Backend Dependencies`
                });

                //Change directories and start the server build process
                return exec.quiet(`cd ${__dirname}/../temporary/${serverFolder}/ && ${packageManager} install`);
            })
            .then(() => {

                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Backend Dependencies Installed`
                });
                return appInfo;
            })
            .catch((error) => {
                return new Error('filesystem.runBuildTools() >>> ' + error);
            });
    }

    //Else If there's only a client build process
    else if (clientBuild) {

        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId: appInfo.userId,
            payload: `This May Take A While...`
        });

        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId: appInfo.userId,
            payload: `Installing Frontend Dependencies and Building`
        });

        //Change directories and start the client build process
        return exec.quiet(`cd ${__dirname}/../temporary/${clientFolder}/ && ${packageManager} install && ${packageManager} run build`)
            .then(() => {
                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Frontend Dependencies Installed and Built`
                });
                return appInfo;
            })
            .catch((error) => {
                return new Error('filesystem.runBuildTools() >>> ' + error);
            });
    }

    //Else If there's only a backend
    else if (server) {

        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId: appInfo.userId,
            payload: `Installing Backend Dependencies`
        });

        //Change directories and start the server build process
        return exec.quiet(`cd ${__dirname}/../temporary/${serverFolder}/ && ${packageManager} install`)
            .then(() => {
                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Server Dependencies Installed`
                });
                return appInfo;
            })
            .catch((error) => {
                return new Error('filesystem.runBuildTools() >>> ' + error);
            });
    }

    //Else there's no build process and no packages to install
    //Just return the settings object
    else {
        return new Promise(resolve => resolve(appInfo));
    }
}

const replaceLocalhost = (appInfo) => {

    return new Promise(async (resolve, reject) => {
        try {

            //Update the store log
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Deducing The Next Available Port For Your Containers`
            });

            //Generate the container ID and replace the debug document
            appInfo = await containers.nextId(appInfo);

            //Update the store log and state
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Next Available Docker Ports Found: Nginx=${7000 + appInfo.id} Node=${8000 - appInfo.id}`
            });
            reduxStore.dispatch({
                type: reduxActions.UPDATE_APP_STATE,
                userId: appInfo.userId,
                payload: {
                    id: appInfo.id
                }
            });

            //If there's a Node server in the repo (according to the .debug settings file)
            //Then replace all instances of localhost with the Node container name
            if (appInfo.settings.server) {

                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Searching For Frontend JS Files`
                });

                //Construct path to client build folder
                let folderToSearch = __dirname + '/../temporary/' + appInfo.userId;
                if (appInfo.settings.clientRoot !== '/') folderToSearch += appInfo.settings.clientRoot;
                if (appInfo.settings.clientBuild !== '/' && appInfo.settings.clientBuild) folderToSearch += appInfo.settings.clientBuildRoot;

                //Get an array of JS files inside the directory
                const javascriptFiles = await findGeneralFiles(folderToSearch, '.js');

                reduxStore.dispatch({
                    type: reduxActions.ADD_TO_APP_LOG,
                    userId: appInfo.userId,
                    payload: `Replacing All References of localhost:${appInfo.settings.serverPort} to localhost:${8000-appInfo.id}`
                });

                //For each Javascript file found
                javascriptFiles.forEach(async (file, index) => {
                    //Get the file
                    const fileData = await fs.readFileSync(file, "utf8");
                    //Construct RegEx
                    const regExSearch = new RegExp(`localhost:${appInfo.settings.serverPort}`, 'g');
                    //Make a new file
                    const newFile = fileData.replace(regExSearch, `localhost:${8000-appInfo.id}`);
                    //Replace the file
                    await fs.writeFileSync(file, newFile, 'utf-8');

                    //If it's the last one in the list then resolve the promise
                    if (index + 1 === javascriptFiles.length) {
                        resolve(appInfo);

                        reduxStore.dispatch({
                            type: reduxActions.ADD_TO_APP_LOG,
                            userId: appInfo.userId,
                            payload: `Finished Replacing All Frontend References of localhost:${appInfo.settings.serverPort} to localhost:${8000-appInfo.id}`
                        });
                    }
                });

                //Else do nothing
            } else {
                resolve(appInfo);
            }

        } catch (error) {
            reject(new Error('filesystem.replaceLocalhost() >>> ' + error));
        }
    });
}


const findGeneralFiles = async (folder, extension, ignore = [], fileList = []) => {

    //Array of files and directories in folder
    const files = await fs.readdirSync(folder);

    //Iterate through array
    for (file of files) {

        //Construct full path
        const filePath = path.join(folder, file);

        //Get info on file/folder
        const stat = await fs.statSync(filePath);

        //Test if it's a directory
        if (stat.isDirectory()) {

            //Returns truthy if folder should be ignored
            const ignored = ignoredFile(filePath, ignore);

            //If it's not ignored
            if (!ignored) {
                //Send new directory back through function recursively
                fileList = await findGeneralFiles(filePath, extension, ignore, fileList);
            }
        }
        //For all files that match the extension we're searching for
        else if (file.endsWith(extension)) {

            //Returns truthy if folder should be ignored
            const ignored = ignoredFile(filePath, ignore);

            //If it's not ignored
            if (!ignored) {
                //Add them to the list
                fileList.push(filePath);
            }
        }
    }

    return fileList;

    //Determine if the file or folder should be ignored
    function ignoredFile(filePath, ignore) {

        //Exclude ignored files and folders from searches
        let ignored = false;

        //For each ignored item
        for (const i in ignore) {

            //If the filepath matches, then toggle ignore
            if (filePath.includes(ignore[i])) {
                ignored = true;
            }
        }

        //Return boolean
        return ignored;
    }
}

//Begin building an object which accumulates data on each step throughout the analysis process
const setupApp = appInfo => {

    //Remove the user's temporary folder (if it already exists)
    return removeFolder(appInfo)

        //Clone Git Repo to a folder that equals the user ID inside the temporary folder    
        .then((appInfo) => {
            return cloneRepo(appInfo);
        })

        //Switch to the proper branch of the repository
        .then((appInfo) => {
            return checkoutBranch(appInfo);
        })

        //Parse Settings File
        .then((appInfo) => {
            return parseSettings(appInfo);
        })

        .catch(function (error) {
            console.log(error);
        });
}

module.exports = {
    cloneRepo,
    checkoutBranch,
    findGeneralFiles,
    parseSettings,
    runBuildTools,
    removeFolder,
    replaceLocalhost,
    setupApp
};