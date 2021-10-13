'use strict'
// import database to business code
const { } = require('../config');
// import utils
const { Response } = require('../config/Util');


exports.getData = (req, res, next) => {
    console.log('welcome');
    Response(res, 200, true, "welcome to api panel");
}