'use strict';
// import the require files
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const dotenv = require('dotenv').config()
const compression = require('compression');

// Import all routes
const indexRouter = require('./routes/index');

// Intialize the app and development things
const app = express();
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Access to Origin and Methods
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'POST');
        return res.status(200).json({});
    }
    next();
});

// Declair the routes
app.use('/', indexRouter);

// Compress the resutl
app.use(compression());

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const error = new Error("Request Not Found");
    error.status = 404;
    next(error);
});

// error handler
app.use((error, req, res, next) => {
    console.warn(error);
    res.status(error.status || 500)
    let message = (error.status) ? error.message : "Internal Server Error"
    console.warn(error)
    res.json({
        error: true,
        message: message,
    })
    return false;
});

module.exports = app;
