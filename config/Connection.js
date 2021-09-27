'use strict';
const dotenv = require('dotenv').config()

module.exports = {
    URI :   `${process.env.DILET}://${process.env.HOST}/${process.env.DATABASE}`,
    POOL:   {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            },
}