//Dependencies
const {
    fork
} = require("child_process");

//Create router
const express = require('express');
const lifecycleRouter = express.Router();

//Import Libraries
const containers = require('../docker/containers');

//Redux Store
const middleware = require('./middleware');
const reduxStore = require('../state/store');
const reduxActions = require('../state/actions');
//reduxStore.getState() - get current state
//reduxStore.subscribe(event=>{console.log(event)}) - add event listener on actions


/*

    Routes:


*/

lifecycleRouter.get('/stop', middleware.authenticator, (req, res) => {

    const userId = req.headers.userId;
    const appInfo = reduxStore.getState().runningApps.find(f => f.userId == userId);

    if (appInfo && appInfo.log) {
        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId,
            payload: `Docker Cleanup Initiated. Stopping Containers...`
        });

        //Then shutdown the Docker containers and delete the network
        containers.dockerCleanup(appInfo)
            .then(result => {
                //console.log('\n\n Docker Cleanup Finished:', reduxStore.getState().runningApps[0]);
                res.status(200).json(result);
            })
            .catch(error => {
                console.log(error);
                res.status(500).json({
                    message: "Internal Server Error"
                });
            });
    } else {
        res.status(500).json({
            message: "Internal Server Error - App Doesn't Exist"
        });
    }

});

lifecycleRouter.get('/start', middleware.authenticator, (req, res) => {

    const userId = req.headers.userId;
    const appInfo = reduxStore.getState().runningApps.find(f => f.userId == userId);

    if (appInfo && appInfo.log) {

        //Start analysis flow
        // analysisEngine.startAnalysis(appInfo)
        //     .then(result => {
        //         res.status(200).json(result)
        //     })
        //     .catch(error => {
        //         console.log(error);
        //         res.status(500).json({
        //             message: "Internal Server Error"
        //         });
        //     });
    } else {
        res.status(500).json({
            message: "Internal Server Error - App Doesn't Exist"
        });
    }

});


lifecycleRouter.get('/setup', middleware.authenticator, (req, res) => {

    const userId = req.headers.userId;
    const appInfo = reduxStore.getState().runningApps.find(f => f.userId == userId);

    if (appInfo && appInfo.log) {

        //Start analysis flow
        // filesystem.setupApp(appInfo)
        //     .then(result => {
        //         res.status(200).json(result);
        //     })
        //     .catch(error => {
        //         console.log(error);
        //         res.status(500).json({
        //             message: "Internal Server Error"
        //         });
        //     });
    } else {
        res.status(500).json({
            message: "Internal Server Error - App Doesn't Exist"
        });
    }


});

lifecycleRouter.get('/reset', middleware.authenticator, (req, res) => {

    const userId = req.headers.userId;
    const appInfo = reduxStore.getState().runningApps.find(f => f.userId == userId);

    if (appInfo && appInfo.log) {
        reduxStore.dispatch({
            type: reduxActions.ADD_TO_APP_LOG,
            userId,
            payload: `Resetting App State...`
        });
    }

    //The user has an app's state in the store
    //Replace this user's app's state in the store
    //That will erase old data.
    reduxStore.dispatch({
        type: reduxActions.REPLACE_APP_STATE,
        payload: {
            userId,
            log: [
                `Resetting Previous App Settings...`,
                `Created Project File For User ID# ${userId}`
            ]
        },
        userId
    });

    res.status(200).json({
        userId,
        log: [
            `Resetting Previous App Settings...`,
            `Created Project File For User ID# ${userId}`
        ]
    })
});

module.exports = lifecycleRouter;