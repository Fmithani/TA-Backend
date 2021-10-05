const AWS = require("aws-sdk");
const config = require("../config/config");
const tables = require("../config/tables");
const model = require("../model/image");
const { v4: uuidv4 } = require("uuid");
const { Response } = require('../config/Util');
const MESSAGE = require('../config/messages');

const isDev = process.env.NODE_ENV !== "production";

const s3Client = new AWS.S3({
    accessKeyId: config.awsAccesskeyID,
    secretAccessKey: config.awsSecretAccessKey,
	region : config.awsRegion
});

const uploadParams = {
    Bucket: process.env.BUCKET_S3, 
    Key: '', // pass key
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
    }
    catch(error) {
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
      Items.forEach(r=>{
        r.url = config.awsS3BaseUrl + '' + r.file_name ?? ''
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
        Item.url = config.awsS3BaseUrl + '' + Item.file_name ?? '';

        return Response(res, true, MESSAGE.RECORD_RETRIVED, Item);
    }
  });
};

saveImage = async (req, res, _data) => {
    
    model.createImageTable();

    if (isDev) {
      AWS.config.update(config.aws_local_config);
    } else {
      AWS.config.update(config.aws_remote_config);
    }

    const file_name = _data.key;
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
            params.Item.Url = _data.Location;
          return Response(res, true, MESSAGE.RECORD_SAVE, params.Item);
      }
    });  
}

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
