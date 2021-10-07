const AWS = require("aws-sdk");
const config = require("../config/config");
const tables = require("../config/tables");
const model = require("../model/image");
const { v4: uuidv4 } = require("uuid");
const { Response } = require("../config/Util");
const MESSAGE = require("../config/messages");

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
  maxAge: 0,
  max: 500000000000,
  length: (label) => {
    return label.length * 100;
  },
});

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
        let Item = Items[0];
        if (Item.file_name !== undefined)
          Item.url = config.awsS3BaseUrl + "" + Item.file_name ?? "";
        cache.set(label, Item);
        return Response(res, true, MESSAGE.RECORD_RETRIVED, Item);
      }
    });
  }
};
