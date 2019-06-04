const jwt = require('jsonwebtoken');

const authenticator = (req, res, next) => {
    try {
        req.headers.userId = jwt.verify(req.headers.authorization, process.env.SECRET);
        next();
    } catch (error) {
        res.status(403).json({
            error: 'Unauthorized Request'
        });
    }
}

module.exports = {
    authenticator
}