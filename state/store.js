const Redux = require('redux');
const reducer = require('./reducer');
const store = Redux.createStore(reducer);

module.exports = store;