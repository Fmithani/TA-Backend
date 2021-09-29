'use strict'
const express = require('express');
const router = express.Router();
// import controllers
const { getData } = require('../controller')


router.get('/getdata', getData);


module.exports = router;
