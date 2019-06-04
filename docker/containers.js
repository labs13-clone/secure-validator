const exec = require('executive');
const fs = require("fs");
const reduxActions = require('../state/actions');
const reduxStore = require('../state/store');

const createAllContainers = (appInfo) => {
    return new Promise(async (resolve, reject) => {
        try {
            //Check if the repo as a server, if so run its container
            if (appInfo.settings.server) {
                appInfo = await createContainerNode(appInfo);
            }

            //Check if the repo has a client, if so run its container
            if (appInfo.settings.client) {
                appInfo = await createContainerNginx(appInfo);
            }

            //Resolve promise with updated debug document
            resolve(appInfo);

        } catch (error) {
            reject(new Error('manageContainer.createAllContainers()' + error))
        }
    });
}

const createNetwork = (appInfo) => {
    //Create the Docker network
    return exec.quiet(`docker network create network${appInfo.id}`)

        .then(() => {
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Network Created: Network${appInfo.id}`
            });
            return appInfo;
        })

        .catch((error) => {
            throw new Error('containers.createNetwork() >>> ' + error);
        });
}

const createContainerNginx = (appInfo) => {
    //Construct the proper path to the client source
    let sourceFolder = __dirname + '/../temporary/' + appInfo.userId;
    if (appInfo.settings.clientRoot !== '/') sourceFolder += appInfo.settings.clientRoot;
    if (appInfo.settings.clientBuild !== '/' && appInfo.settings.clientBuild) sourceFolder += appInfo.settings.clientBuildRoot;

    const command = `docker container run -d --rm --name nginx${appInfo.id} -p ${7000 + appInfo.id}:80 --network network${appInfo.id} -v ${sourceFolder}:/usr/share/nginx/html nginx`;

    //Run docker command
    return exec(command)

        .then((id) => {

            console.log(id);

            //exec() returns an object
            id = id.stdout;            

            const newContainer = {
                //Remove the /N at the end of the ID
                id: id.substring(0, id.length - 2),
                type: 'nginx',
                name: `nginx${appInfo.id}`,
                port: `${7000 + Number(appInfo.id)}`,
                running: true,
                exists: true
            };

            //Add the container info to the appInfo
            //If there's already containers for this app
            if (appInfo.containers && appInfo.containers.length >= 1) {

                appInfo = {
                    ...appInfo,
                    containers: [
                        ...appInfo.containers,
                        newContainer
                    ]
                };

                //Update the store
                reduxStore.dispatch({
                    type: reduxActions.UPDATE_APP_STATE,
                    userId: appInfo.userId,
                    payload: {
                        containers: [
                            ...appInfo.containers
                        ]
                    }
                });

            }
            //Else it's the first container for this app
            else {
                appInfo.containers = [
                    newContainer
                ];

                //Update the store
                reduxStore.dispatch({
                    type: reduxActions.UPDATE_APP_STATE,
                    userId: appInfo.userId,
                    payload: {
                        containers: [
                            newContainer
                        ]
                    }
                });
            }

            //Add to the app's log
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Nginx Container Running: ${id}`
            });

            return appInfo;
        })
        .catch((error) => {
            throw new Error('containers.createContainer() >>> ' + error);
        });
}

const createContainerNode = (appInfo) => {

    //If there's a build process, then send Nginx the folder resulting from it
    let sourceFolder = __dirname + '/../temporary/' + appInfo.userId;
    if (appInfo.settings.serverRoot !== '/') sourceFolder += appInfo.settings.serverRoot;

    const command = `docker run -d --rm --name node${appInfo.id} -p ${8000-appInfo.id}:${appInfo.settings.serverPort} --network network${appInfo.id} -v ${sourceFolder}:/usr/src/app -w /usr/src/app node:8 node ${appInfo.settings.serverEntry}`;

    //Run docker command
    return exec.quiet(command)

        .then((id) => {

            //exec() returns an object
            id = id.stdout;

            const newContainer = {
                //Remove the /N at the end of the ID
                id: id.substring(0, id.length - 2),
                type: 'node',
                name: `node${appInfo.id}`,
                port: `${8000-appInfo.id}`,
                running: true,
                exists: true
            };

            //If there's already a container in the appInfo
            if (appInfo.containers && appInfo.containers.length >= 1) {

                //Add a new object in the appInfo.container array
                appInfo = {
                    ...appInfo,
                    containers: [
                        ...appInfo.containers,
                        newContainer
                    ]
                };

                //Update the store
                reduxStore.dispatch({
                    type: reduxActions.UPDATE_APP_STATE,
                    userId: appInfo.userId,
                    payload: {
                        containers: [
                            ...appInfo.containers
                        ]
                    }
                });

            } else {

                //Else it's the first and/or only container for this app
                appInfo.containers = [newContainer];

                //Update the store
                reduxStore.dispatch({
                    type: reduxActions.UPDATE_APP_STATE,
                    userId: appInfo.userId,
                    payload: {
                        containers: [
                            newContainer
                        ]
                    }
                });
            }

            //Add to the app's log in the store
            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Node Container Running: ${id}`
            });

            return appInfo;
        })
        .catch((error) => {
            throw new Error('containers.createContainerNode() >>> ' + error);
        });
}

const nextId = (appInfo) => {

    //List currently running networks
    return exec.quiet('docker network ls')

        .then((response) => {

            /*

                To support multiple applications running at once:
                Dynamic naming convention for the docker containers needed to be established
                Each app/websites containers will be appended with a number, starting at 0
                Here we test a docker network ls response to see the highest number container already running
                We establish that number as the app/websites' id # which is appended on all of its containers

            */

            try {
                //exec() returns an object
                response = response.stdout;

                //The response is in table format:
                //Each column is separated by a tab
                //Each row is separated by a new line
                //So we split the table it into an array matrix
                //We're only needing the next network # here
                //So after parsing into a matrix, we delete everything but the names which are stored in index #1 via .map()
                let table = response.split(/\r?\n/).map(row => row.split(/\s{2,}|\t/)).map(row => row[1]);

                //Flatten the matrix since only 1 value is left per array item.. all the names of active docker networks
                //Array.flat() is not in this version of Nodejs, so [].concat.apply([], table) is used instead.
                table = [].concat.apply([], table);

                //Remove the header of the table because it's not actually a name of a docker network, but instead the heading of the table
                table.shift();

                //See if a network has already been created
                //Get the last network # created
                //Docker networks are created with the naming convention 'network1' then 'network2' etc
                const id = table.reduce(function (current, next) {
                    if (next && next.startsWith('network') && Number(next.slice(7)) > current) {
                        return Number(next.slice(7))
                    } else {
                        return current;
                    }
                }, 0) + 1;

                //Store is updated in filesystem.replaceLocalhost
                //For some reason reduxActions was undefined in this function???            

                return {
                    ...appInfo,
                    id
                };
            } catch (error) {
                console.log(error)
            }
        })
        .catch((error) => {
            throw new Error('containers.nextId() >>> ', error);
        });
}

const stopAllContainers = (appInfo) => {

    //Create a Promise array full of promises for each container in appInfo.containers
    return Promise.all(appInfo.containers.map((container) => {

            //Stop the container
            return exec.quiet(`docker container stop ${container.id}`)

                .then(() => {
                    //Update the appInfo that the container is no longer running
                    container.running = false;
                    container.exists = false;

                    reduxStore.dispatch({
                        type: reduxActions.ADD_TO_APP_LOG,
                        userId: appInfo.userId,
                        payload: `Container Stopped: ${container.id}`
                    });
                    return container;
                });
        }))
        .then((newContainers) => {

            //Update the store
            reduxStore.dispatch({
                type: reduxActions.UPDATE_APP_STATE,
                userId: appInfo.userId,
                payload: {
                    containers: newContainers
                }
            });

            return {
                ...appInfo,
                containers: newContainers
            };
        })
        .catch((error) => {
            throw new Error('containers.stopAllContainer() >>> ' + error);
        });
}

const deleteAllContainers = (appInfo) => {

    //Create a Promise array full of promises for each container in appInfo.containers
    return Promise.all(appInfo.containers.map(container => {
            //Stop the container
            return exec.quiet(`docker container rm ${container.id}`)

                .then(() => {
                    //Update the appInfo that the container is no longer running
                    container.exists = false;
                    reduxStore.dispatch({
                        type: reduxActions.ADD_TO_APP_LOG,
                        userId: appInfo.userId,
                        payload: `Container Deleted: ${container.id}`
                    });

                    return container;
                });
        }))
        .then((newContainers) => {

            //Update the store
            reduxStore.dispatch({
                type: reduxActions.UPDATE_APP_STATE,
                userId: appInfo.userId,
                payload: {
                    containers: newContainers
                }
            });

            return {
                ...appInfo,
                containers: newContainers
            };
        })
        .catch((error) => {
            reject(new Error('containers.deleteAllContainers() >>> ' + error));
        });
}

const deleteNetwork = (appInfo) => {

    //Delete the network
    return exec.quiet(`docker network rm network${appInfo.id}`)

        .then(() => {

            reduxStore.dispatch({
                type: reduxActions.ADD_TO_APP_LOG,
                userId: appInfo.userId,
                payload: `Network Removed: network${appInfo.id}`
            });

            //Return the debug document
            return appInfo;
        })
        .catch((error) => {
            reject(new Error('containers.deleteNetwork() >>> ' + error));
        });
}

const dockerCleanup = (appInfo) => {

    //Stop Docker Container
    return stopAllContainers(appInfo)

        //Delete Docker Network
        .then((appInfo) => {
            return deleteNetwork(appInfo);
        })
        .catch(error => {
            throw new Error('containers.stopAllContainers() >>> ' + error);
        });
}

const startupCleanup = (appInfo) => {

    //Currently the server's state resets on startup
    //So stop and remove previous containers and networks
    //Otherwise they would run indefinitely and waste resources
    //Remove currently running containers
    exec.quiet('docker container ls')

        .then((response) => {

            try {
                //exec() returns an object
                response = response.stdout;

                //The response is in table format:
                //Each column is separated by a tab
                //Each row is separated by a new line
                //So we split the table it into an array matrix
                //We're only needing the container IDs here
                //So after parsing into a matrix, we delete everything but the IDs which are stored in index #0 via .map()
                let table = response.split(/\r?\n/).map(row => row.split(/\s{2,}|\t/)).map(row => row[0]);

                //Flatten the matrix since only 1 value is left per array item.. all the names of active docker networks
                //Array.flat() is not in this version of Nodejs, so [].concat.apply([], table) is used instead.
                table = [].concat.apply([], table);

                //Remove the header of the table because it's not actually a docker container ID, but instead the heading of the table
                table.shift();
                table.pop();

                table.forEach(containerId =>
                    //Remove currently running container
                    exec.quiet('docker container rm -f ' + containerId));

                //Store is updated in filesystem.replaceLocalhost
                //For some reason reduxActions was undefined in this function???            

                //Remove currently running networks
                return exec.quiet('docker network ls');

            } catch (error) {
                console.log(error)
            }
        })

        .then((response) => {

            try {
                //exec() returns an object
                response = response.stdout;

                //The response is in table format:
                //Each column is separated by a tab
                //Each row is separated by a new line
                //So we split the table it into an array matrix
                //We're only needing the next network IDs and name
                //So after parsing into a matrix, we delete everything but the IDs which are stored in index #1 via .map()
                let table = response.split(/\r?\n/).map(row => row.split(/\s{2,}|\t/)).map(row => row.slice(0, 2));

                //Remove the header of the table because it's not actually a name of a docker network, but instead the heading of the table
                table.shift();
                table.pop();

                //See if a network is running whose name starts with network
                //End each one that matches that description
                table.forEach(network => {

                    //If it's not one of the 3 networks Docker creates automatically
                    //(all networks debug wizard creates are named "network1", "network2", etc)
                    if (network[1] !== undefined && network[1].startsWith('network')) {

                        //Remove currently network
                        exec.quiet('docker network rm ' + network[0]);
                    }
                });

            } catch (error) {
                console.log(error)
            }
        })
        .catch((error) => {
            throw new Error('containers.nextId() >>> ', error);
        });
}

const createProxyPath = async (appInfo) => {
    
    // Create nginx location to frontend and backend:
    // containers/:userId/nginx
    // containers/:userId/node
    // Reload Nginx server with new settings

    appInfo.containers = await appInfo.containers.map(async container => {
        if (container.running) {
            return await createConfiguration(container);
        } else {
            return container;
        }
    });

    //Update the store
    reduxStore.dispatch({
        type: reduxActions.UPDATE_APP_STATE,
        userId: appInfo.userId,
        payload: {
            containers: appInfo.containers
        }
    });

    return appInfo;

    function createConfiguration(container) {

        //Create the nginx proxy pass location configuration file if it doesn't exist
        //If it does exist, then clear its contents
        exec.quiet(`touch ${__dirname}/nginxConfs/${appInfo.userId}-${container.type}.conf`)

            //Write to the configuration file
            .then(() => {
                const settings = `location /containers/${appInfo.userId}/${container.type} {
                    proxy_pass http://localhost:${container.port};
                    proxy_http_version 1.1;
                    proxy_set_header Upgrade $http_upgrade;
                    proxy_set_header Connection 'upgrade';
                    proxy_set_header Host $host;
                    proxy_cache_bypass $http_upgrade;
                }`;

                return fs.writeFileSync(`${__dirname}/nginxConfs/${appInfo.userId}-${container.type}.conf`, settings);
            })
            //Check that the current nginx configuration is valid
            .then(response => {
                return exec.quiet(`sudo nginx -t`);
            })
            .then(response => {

                //If the settings are valid then reload the Nginx server with the new settings
                if(response.stdout.contains('test is successful')) {
                    return exec.quiet(`sudo systemctl reload nginx`);
                }
                
                //Else abandon dynamic analysis.. an unknown error occurred
                else {

                    reduxStore.dispatch({
                        type: reduxActions.ADD_TO_APP_LOG,
                        userId: appInfo.userId,
                        payload: `An error occurred while creating the Nginx configuration file`
                    });

                    console.log('Nginx Config Error', response.stdout);

                    //Remove the settings file with the error
                    exec.quiet(`rm ${__dirname}/nginxConfs/${appInfo.userId}-${container.type}.conf`);

                    throw new Error({message: 'Nginx Configuration Failed'});
                }
            })
            .then(_ => {
                container.proxyPath = `/containers/${appInfo.userId}/${container.type}`;
                container.proxied = true;
                return container;
            })
            .catch(err => {
                console.log(err);
            });
    }
}

const deleteProxyPath = async (appInfo) => {
    //Remove app's nginx locations
    //Reload Nginx server

    appInfo.containers = await appInfo.containers.map(async container => {
        if (container.running) {
            return await destroyConfiguration(container);
        } else {
            return container;
        }
    });

    //Update the store
    reduxStore.dispatch({
        type: reduxActions.UPDATE_APP_STATE,
        userId: appInfo.userId,
        payload: {
            containers: appInfo.containers
        }
    });

    return appInfo;

    function destroyConfiguration(container) {

        //Create the nginx proxy pass location configuration file if it doesn't exist
        //If it does exist, then clear its contents
        exec.quiet(`rm ${__dirname}/nginxConfs/${appInfo.userId}-${container.type}.conf`)

            //Check that the current nginx configuration is valid
            .then(response => {
                return exec.quiet(`sudo nginx -t`);
            })
            .then(response => {

                //If the settings are valid then reload the Nginx server with the new settings
                if(response.stdout.contains('test is successful')) {
                    return exec.quiet(`sudo systemctl reload nginx`);
                }
                
                //Else abandon dynamic analysis.. an unknown error occurred
                else {

                    reduxStore.dispatch({
                        type: reduxActions.ADD_TO_APP_LOG,
                        userId: appInfo.userId,
                        payload: `An error occurred while creating the Nginx configuration file`
                    });

                    console.log('Nginx Config Error', response.stdout);

                    //Remove the settings file with the error
                    exec.quiet(`rm ${__dirname}/nginxConfs/${appInfo.userId}-${container.type}.conf`);

                    throw new Error({message: 'Nginx Configuration Failed'});
                }
            })
            .then(_ => {
                container.proxied = false;
                return container;
            })
            .catch(err => {
                console.log(err);
            });
    }
}

module.exports = containers = {
    createAllContainers,
    createContainerNode,
    createContainerNginx,
    createNetwork,
    createProxyPath,
    deleteAllContainers,
    deleteNetwork,
    deleteProxyPath,
    dockerCleanup,
    nextId,
    stopAllContainers,
    startupCleanup
};