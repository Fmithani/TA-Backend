'use strict';
import express from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import Dotenv from 'dotenv'
import compression from 'compression'
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { SetDirectoryPath } from './config/Util.js';
// Intialize the .env file
const dotenv = Dotenv.config()
// Intialize the __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));
SetDirectoryPath(__dirname)

// import the Routers
import IndexRouter from './routes/Index.js'


const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(`${__dirname}/public`));

// CORS Functionality
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'POST');
    return res.status(200).json({});
  }
  next();
});

// Intialize Routers
app.use('/', IndexRouter);


app.use(compression());

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const error = new Error("Request Not Found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  console.warn(error);
  res.status(error.status || 500)
  let message = (error.status) ? error.message : "Internal Server Error"
  res.json({
    error: true,
    message: message,
  })
  return false;
});

export default app;