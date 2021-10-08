const AWS = require("aws-sdk");
const config = require("../config/config");
const tables = require("../config/tables");
const model = require("../model/image");
const { v4: uuidv4 } = require("uuid");
const { Response } = require("../config/Util");
const MESSAGE = require("../config/messages");

const isDev = process.env.NODE_ENV !== "production";

const s3Client = new AWS.S3({
  accessKeyId: config.awsAccesskeyID,
  secretAccessKey: config.awsSecretAccessKey,
  region: config.awsRegion,
});

const uploadParams = {
  Bucket: process.env.BUCKET_S3,
  Key: "", // pass key
  Body: null, // pass file body,
  Metadata: null,
};

const s3 = {};
s3.s3Client = s3Client;
s3.uploadParams = uploadParams;

exports.uploadImage = async (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }
  // console.log(config.aws_remote_config);
  try {
    let s3Client = s3.s3Client;
    let params = s3.uploadParams;

    params.Key = req.file.originalname;
    params.Body = req.file.buffer;
    params.Metadata = {
      "Content-Type": req.file.mimetype,
    };

    s3Client.upload(params, async (err, data) => {
      if (err) {
        return Response(res, false, MESSAGE.FILE_NOT_UPLOAD, err);
      }

      return await saveImage(req, res, data);
    });
  } catch (error) {
    return Response(res, false, MESSAGE.UPLOADING_ERROR);
  }
};

// Gets all fruits
exports.getImages = async (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: tables.IMAGES,
  };
  docClient.scan(params, function (err, data) {
    if (err) {
      return Response(res, false, MESSAGE.RECORD_NOT_RETRIVED, err);
    } else {
      const { Items } = data;
      Items.forEach((r) => {
        r.url = config.awsS3BaseUrl + "" + r.file_name ?? "";
      });
      return Response(res, true, MESSAGE.RECORD_RETRIVED, Items);
    }
  });
}; // end of app.get(/api/fruits)

// Get a single fruit by id
exports.getImageById = async (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }
  const image_id = req.query.image_id;
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: tables.IMAGES,
    KeyConditionExpression: "image_id = :i",
    ExpressionAttributeValues: {
      ":i": image_id,
    },
  };

  docClient.query(params, function (err, data) {
    if (err) {
      return Response(res, false, MESSAGE.RECORD_NOT_RETRIVED, err);
    } else {
      const { Items } = data;

      let Item = Items[0];
      Item.url = config.awsS3BaseUrl + "" + Item.file_name ?? "";

      return Response(res, true, MESSAGE.RECORD_RETRIVED, Item);
    }
  });
};

saveImage = async (req, res, image) => {
  
  model.createImageTable();

  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

  
  image = await getLablesRekognition(image);

  // Face Detection 
  let faceKeyword = ['Person', 'Human', 'Face'];
  let haveFace = faceKeyword.every(i => image.LabelsArray.includes(i));
  if (haveFace) {
      image = await getFaceRekognition(image);
  }

  const file_name = image.key;
  // Not actually unique and can create problems.
  const imageId = uuidv4();
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: tables.IMAGES,
    Item: {
      _id: imageId,
      file_name,
      labels: image.LabelsArray,
      confidence: image.ConfidenceObj,
      face: image?.FaceDetails,
    },
  };
  docClient.put(params, function (err, data) {
    if (err) {
      return Response(res, false, MESSAGE.RECORD_NOT_SAVE, err);
    } else {
      params.Item.url = image.Location;
      return Response(res, true, MESSAGE.RECORD_SAVE, params.Item);
    }
  });
};

getLablesRekognition = (imageData) => {
  return new Promise((resolve, reject) => {
    // console.log('label detection =>', imageData);

    var params = {
      Image: {
        S3Object: {
          Bucket: process.env.BUCKET_S3,
          Name: imageData.key,
        },
      },
    };

    imageData.LabelsArray = [];
    imageData.ConfidenceObj = {};

    const rekognition = new AWS.Rekognition();

    rekognition.detectLabels(params, function (err, data) {
      if (err) {
        // console.log('error => ', err);
        reject(imageData);
      } else {
        // console.log('success=>', data);
        var labelArray = [];
        var confidenceObj = {};

        data.Labels.map((obj) => {
          labelArray.push(obj.Name);
          confidenceObj[obj.Name] = obj.Confidence;
        });

        imageData.LabelsArray = labelArray;
        imageData.ConfidenceObj = confidenceObj;

        //   console.log('image data => ', imageData);

        resolve(imageData);
      }
    });
  });
};

getFaceRekognition = (imageData) => {
    return new Promise((resolve, reject) => {
      // console.log('label detection =>', imageData);
  
      var params = {
        Image: {
          S3Object: {
            Bucket: process.env.BUCKET_S3,
            Name: imageData.key,
          },
        },
      };
  
      const rekognition = new AWS.Rekognition();
  
      rekognition.detectFaces(params, function (err, data) {
        if (err) {
          reject(imageData);
        } else {

          imageData.FaceDetails = data.FaceDetails;
  
          resolve(imageData);
        }
      });
    });
  };

exports.labelRekognitionV1 = async (req, res, next) => {
  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

  //input parameters
  const { file_name } = req.body;

  var params = {
    Image: {
      S3Object: {
        Bucket: process.env.BUCKET_S3,
        Name: file_name,
      },
    },
  };

  //Call AWS Rekognition Class
  const rekognition = new AWS.Rekognition();

  //Detect text
  rekognition.detectLabels(params, function (err, data) {
    if (err) {
      console.log(err, err.stack); // an error occurred
      return Response(res, false, MESSAGE.UNAUTHORISED_USER, err);
    }
    // console.log(data);           // successful response
    else var labelArray = [];
    var confidenceObj = {};

    data.Labels.forEach((obj) => {
      labelArray.push(obj.Name);
      confidenceObj[obj.Name] = obj.Confidence;
    });

    data.LabelsArray = labelArray;
    data.ConfidenceObj = confidenceObj;

    return Response(res, true, MESSAGE.UNAUTHORISED_USER, data);

    //console.log(data.TextDetections);

    // for(var i = 0; i < data.TextDetections.length;i++){

    //   //console.log(data.TextDetections[i].Type)

    //   if(data.TextDetections[i].Type === 'LINE')
    //   {
    //     detectedTXT = data.TextDetections[i].DetectedText;
    //   }
    // }

    // console.log(detectedTXT);
  });
};

exports.postImageV1 = async (req, res, next) => {
  model.createImageTable();

  if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }
  const { file_name } = req.body;
  // Not actually unique and can create problems.
  const imageId = uuidv4();
  const docClient = new AWS.DynamoDB.DocumentClient();
  const params = {
    TableName: tables.IMAGES,
    Item: {
      image_id: imageId,
      file_name,
    },
  };
  docClient.put(params, function (err, data) {
    if (err) {
      return Response(res, false, MESSAGE.RECORD_NOT_SAVE, err);
    } else {
      return Response(res, true, MESSAGE.RECORD_SAVE, params.Item);
    }
  });
};
