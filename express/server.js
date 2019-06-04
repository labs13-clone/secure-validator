const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const router = require('./router');
const server = express();

server.use(helmet());
server.use(express.json());
server.use(cors());
server.use(morgan(`:method :url :status :response-time ms - :res[content-length]`));

server.use('/lifecycle', router);

module.exports = server;