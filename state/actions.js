const ADD_APP_TO_STORE = 'ADD_APP_TO_STORE';
// {
//     type: ADD_APP_TO_STORE,
//     payload: data
// }


const ADD_TO_APP_LOG = 'ADD_TO_APP_LOG';
// {
//     type: ADD_TO_APP_LOG,
//     payload: data.payload,
//     userId: data.userId
// }

const REPLACE_APP_STATE = 'REPLACE_APP_STATE';
// {
//     type: REPLACE_APP_STATE,
//     payload: data.payload,
//     userId: data.userId
// }

const UPDATE_APP_STATE = 'UPDATE_APP_STATE';
// {
//     type: UPDATE_APP_STATE,
//     payload: data.payload,
//     userId: data.userId
// }

module.exports = {
    ADD_APP_TO_STORE,
    ADD_TO_APP_LOG,
    REPLACE_APP_STATE,
    UPDATE_APP_STATE
}