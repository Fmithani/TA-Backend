const AWS = require("aws-sdk");
const config = require("../config/config");
const tables = require("../config/tables");
const model = require("../model/image");
const { v4: uuidv4 } = require("uuid");
const { Response } = require("../config/Util");
const MESSAGE = require("../config/messages");
const { uploadImageSearch } = require('../controller/image.controller');
const axios = require("axios");

const LRU = require("lru-cache");

const isDev = process.env.NODE_ENV !== "production";

const s3Client = new AWS.S3({
  accessKeyId: config.awsAccesskeyID,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion,
});

const uploadParams = {
  Bucket: process.env.BUCKET_S3,
  Key: "", // pass key
  Body: null, // pass file body
};

// const s3 = {};
// s3.s3Client = s3Client;
// s3.uploadParams = uploadParams;

const cache = new LRU({
  maxAge: -1,
  max: 500000000000,
  length: (label) => {
    return label.length * 100;
  },
});

function compareObjects(object1, object2, key) {
  const obj1 = object1['confidence'][key];
  const obj2 = object2['confidence'][key];

  if (obj1 > obj2) {
    return -1
  }
  if (obj1 < obj2) {
    return 1
  }
  return 0
}


// Get a image search by label
exports.getSearchResult = async (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }
  let label = req.query.label;
  

  // Find in cache
  let getItemFromCache = cache.get(label);

  if (getItemFromCache && getItemFromCache !== undefined) {
   
    return Response(res, true, MESSAGE.RECORD_RETRIVED, getItemFromCache);
  } else {
    console.log("else");
    // Find in DB
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: tables.IMAGES,
      FilterExpression: "contains (labels, :label)",
      ExpressionAttributeValues: {
        ":label": label,
      },
    };

    docClient.scan(params, function (err, data) {
      
      if (err) {
        return Response(res, false, MESSAGE.RECORD_NOT_RETRIVED, err);
      } else {
        const { Items } = data;
       

        for (let i = 0; i < Items.length; i++) {
          if (Items[i].file_name !== undefined)
            Items[i].url = config.awsS3BaseUrl + "" + Items[i].file_name ?? "";
        }
        Items.sort((item1, item2) => {
            return compareObjects(item1, item2, label)
          })
        //cache.set(label, Items);
        return Response(res, true, MESSAGE.RECORD_RETRIVED, Items);
      }
    });
  }
};

getImageObject = async (image_id) => {
  return new Promise((resolve, reject) => {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: tables.IMAGES,
      FilterExpression: "#field = :data",
      ExpressionAttributeNames: {
        "#field": "_id",
      },
      ExpressionAttributeValues: {
        ":data": image_id,
      },
    };

    docClient.scan(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

exports.getSearchByImage = async (req, res, next) => {
  
  uploadImageSearch(req, res, next)
  .then((image)=>{
    //console.log('image upload res => ', image);
    let _image_id = image.ETag;
    let _image_name = image.key;

    let _image_obj = {
      image_id : _image_id,
      image_name: _image_name,
    }
    
    imageRekognitionAPI(_image_obj).then((resImgRekognise) => {
      //console.log('axios label detection response => ', resImgRekognise);
      
      imageSearchAPI(resImgRekognise.data).then((resImgSearch) => {
        //console.log('axios label search response => ', resImgSearch);
        return Response(res, true, MESSAGE.RECORD_RETRIVED, resImgSearch.data.data);
      })
      .catch((errorSearch) => {
        //console.log('axios seaerch error => ', errorSearch);
        return Response(res, true, MESSAGE.RECORD_NOT_RETRIVED, null, 200, errorSearch);
      });
    })
    .catch((errorRekognise) => {
      //console.log('axios rekognise error => ', errorRekognise);
      return Response(res, true, MESSAGE.RECORD_NOT_RETRIVED, null, 200, errorRekognise);
    });
  })
  .catch((errorImage) => {
    //console.log('axios image error => ', errorImage);
    return Response(res, true, MESSAGE.RECORD_NOT_RETRIVED, null, 200, errorImage);
  });
}

imageRekognitionAPI = async(_image_obj) => {
  return axios({
    method: "POST",
    url: process.env.imageRecWebUrl + "api/image-rekognition-search",
    data: {
      image_id : _image_obj.image_id,
      image_name: _image_obj.image_name,
    },
    headers: {
      Authorization:
        "Bearer VEEtQmFja2VuZCBBUEkgQWNjZXNzIFRva2VuClByb2plY3Q6Tm9kZUpTMTQuMTM=",
    },
  });
}

imageSearchAPI = async(_response) => {

  let _label = _response.data.TopLabel;

  return axios({
    method: "GET",
    url: process.env.imageSearchWebUrl + "api/search?label="+_label,
    headers: {
      Authorization:
        "Bearer VEEtQmFja2VuZCBBUEkgQWNjZXNzIFRva2VuClByb2plY3Q6Tm9kZUpTMTQuMTM=",
    },
  });
}
