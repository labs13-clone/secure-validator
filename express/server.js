const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const authRouter = require('./authRouter');
const analysisRouter = require('./analysisRouter');
const lifecycleRouter = require('./lifecycleRouter');

const server = express();

server.use(helmet());
server.use(express.json());
server.use(cors());
server.use(morgan(`:method :url :status :response-time ms - :res[content-length]`));

server.use('/auth', authRouter);
server.use('/analysis', analysisRouter);
server.use('/lifecycle', lifecycleRouter);

module.exports = server;