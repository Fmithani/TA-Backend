'use strict'

const image = require('../controller/image.controller');
const search = require('../controller/search.controller');

const express = require('express');
const router = express.Router();
let upload = require('../config/multer.config.js');

const cors = require('cors')
const app = express()
 
app.use(cors())

router.post('/api/image', image.postImage);
router.get('/api/image', image.getImageById);
router.get('/api/images', image.getImages);
router.post('/api/image-upload', upload.single('file'), image.uploadImage);
router.get('/api/search', search.getSearchResult);

module.exports = router;