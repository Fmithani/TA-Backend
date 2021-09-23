'use strict';
import express from 'express'
import { getData } from '../controller/Index.js'
const IndexRouter = express.Router()


/* . */
/* GET Orders. */
IndexRouter.get('/', getData);



export default IndexRouter