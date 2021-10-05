'use strict'

const image = require('../controller/image.controller');

const express = require('express');
const router = express.Router();
let upload = require('../config/multer.config.js');
const validate = require('../middlware/Validate');

const cors = require('cors')
const app = express()
 
app.use(cors())

router.use(validate.Valid);

router.get('/api/image', image.getImageById);
router.get('/api/images', image.getImages);
router.post('/api/image-upload', upload.single('file'), image.uploadImage);

module.exports = router;