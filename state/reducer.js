const ADD_APP_TO_STORE = require('./actions').ADD_APP_TO_STORE;
const ADD_TO_APP_LOG = require('./actions').ADD_TO_APP_LOG;
const REPLACE_APP_STATE = require('./actions').REPLACE_APP_STATE;
const UPDATE_APP_STATE = require('./actions').UPDATE_APP_STATE;

const initStore = {
    runningApps: []
}

module.exports = (store = initStore, action) => {

    let userAppIndex;
    let newRunningApps;

    switch (action.type) {
        case ADD_APP_TO_STORE:
            //Using spread on an empty array causes first array element index to be -1
            //So push the new app info to the runningApps array if it's empty.
            if (store.runningApps.length === 0) {
                store.runningApps.push({
                    ...action.payload
                })
                return {
                    ...store,
                    runningApps: store.runningApps
                };
            } else {
                return {
                    ...store,
                    runningApps: [
                        ...store.runningApps,
                        action.payload
                    ]
                };
            }
        case ADD_TO_APP_LOG:
            userAppIndex = store.runningApps.findIndex(f => f.userId == action.userId);
            newRunningApps = [...store.runningApps];
            newRunningApps[userAppIndex].log.push(action.payload);
            return {
                ...store,
                runningApps: newRunningApps
            };
        case UPDATE_APP_STATE:
            userAppIndex = store.runningApps.findIndex(f => f.userId == action.userId);
            newRunningApps = [...store.runningApps];
            newRunningApps[userAppIndex] = {
                ...newRunningApps[userAppIndex],
                ...action.payload
            }
            return {
                ...store,
                runningApps: newRunningApps
            };
        case REPLACE_APP_STATE:
            userAppIndex = store.runningApps.findIndex(f => f.userId == action.userId);
            newRunningApps = [...store.runningApps];
            newRunningApps[userAppIndex] = action.payload;
            return {
                ...store,
                runningApps: newRunningApps
            };
        default:
            return store;
    }
}