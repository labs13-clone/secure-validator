# Secure Code Validator
An Express API that runs client-derived code and tests that code in a secure manner via Docker containers.

## Authentication
API is secured by a hard-coded passphrase stored in a .env file under the key passphrase.

# Endpoint
POST /validate

Expects an object literal payload of the following schema:
```
{
    skeletonFunction: JSON - Required
    tests: JSON - Required
    answer: JSON - Required
}
```


Returns a Boolean value:
- true if all tests pass
- false if all tests fail

# Request Lifecycle
- compute container and network ID
- clone pre-configured repo with jest as a dependency
- add skeletonFunction name test
- add other user-submitted tests
- run tests
- check for infinite loops
- return outcome of said tests
- clean up leftover containers
