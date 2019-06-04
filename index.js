require('dotenv').config();
const server = require('./express/server');
const containers = require('./docker/containers');

//Delete any running Docker containers and networks on startup
containers.startupCleanup();

const port = process.env.PORT || 5000;

//Start express server
server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});