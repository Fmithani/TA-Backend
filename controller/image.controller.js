const AWS = require("aws-sdk");
const config = require("../config/config");
const tables = require("../config/tables");
const model = require("../model/image");
const { v4: uuidv4 } = require("uuid");
const { Response } = require("../config/Util");
const MESSAGE = require("../config/messages");
const axios = require("axios");

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

  uploadNSave(req, res).then((uploaded) => {
    let _image_id = [];

    uploaded.map((img) => {
      _image_id.push(img._id);
    });

    axios({
      method: "POST",
      url: process.env.imageRecWebUrl + "api/image-rekognition",
      data: {
        image_id: _image_id,
      },
      headers: {
        Authorization:
          "Bearer VEEtQmFja2VuZCBBUEkgQWNjZXNzIFRva2VuClByb2plY3Q6Tm9kZUpTMTQuMTM=",
      },
    })
      .then((response) => {
        // console.log('axios response => ', response);
        return Response(res, true, MESSAGE.FILE_SUCCESSFULLY, uploaded);
      })
      .catch((error) => {
        // console.log('axios error => ', error);
      });
  });
};

// Gets all fruits
exports.getImages = async (req, res, next) => {
  getImagesObj(req, res)
  .then((result) => {
    const { Items } = result;
    Items.forEach((r) => {
      r.url = config.awsS3BaseUrl + "" + r.file_name ?? "";
    });
    return Response(res, true, MESSAGE.RECORD_RETRIVED, Items);
  })
  .catch((error) => {
    return Response(res, false, MESSAGE.RECORD_NOT_RETRIVED, error);
  });
}; // end of app.get(/api/fruits)


getImagesObj = async (req, res) => {
  return new Promise((resolve, reject) => {
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
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

// Get a single fruit by id
exports.getImageById_V1 = async (req, res, next) => {
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

uploadNSave = async (req, res) => {
  return new Promise((resolve, reject) => {
    let s3Client = s3.s3Client;
    let params = s3.uploadParams;

    model.createImageTable();

    let _res_error = [];
    let _res = [];
    let _total_files = req.files.length;
    let _upload_files = 0;
    let _saved_files = 0;

    req.files.map((file) => {
      params.Key = file.originalname;
      params.Body = file.buffer;
      params.Metadata = {
        "Content-Type": file.mimetype,
      };

      s3Client.upload(params, async (err, data) => {
        if (err) {
          _res_error.push(err);
          _upload_files++;
          console.log("error on upload => ", err);
        } else {
          _upload_files++;
          saveImage(req, res, data)
            .then((success) => {
              _res.push(success);
              _saved_files++;
              if (_saved_files >= _total_files) {
                resolve(_res);
              }
            })
            .catch((fail) => {
              _res_error.push(fail);
              _saved_files++;

              console.log("error on save => ", fail);
            });
        }
      });
    });
  });
};

exports.uploadImageSearch = async (req, res) => {
  return new Promise((resolve, reject) => {
    let s3Client = s3.s3Client;
    let params = s3.uploadParams;

    params.Key = "Search_" + req.file.originalname;
    params.Body = req.file.buffer;
    params.Metadata = {
      "Content-Type": req.file.mimetype,
    };

    s3Client.upload(params, async (err, data) => {
      if (err) {
        console.log("error on upload => ", err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

saveImage = async (req, res, image) => {
  return new Promise((resolve, reject) => {
    if (isDev) {
      AWS.config.update(config.aws_local_config);
    } else {
      AWS.config.update(config.aws_remote_config);
    }

    const file_name = image.key;
    const imageId = uuidv4();
    const docClient = new AWS.DynamoDB.DocumentClient();
    const params = {
      TableName: tables.IMAGES,
      Item: {
        _id: imageId,
        file_name,
      },
    };

    docClient.put(params, function (err, data) {
      if (err) {
        reject(err);
      } else {
        params.Item.url = image.Location;
        resolve(params.Item);
      }
    });
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

  exports.getCommonValues = async (req, res, next) => {
    getImagesObj(req, res)
    .then((result) => {
      let _artist_list = [...new Set(result.Items.map(({artist})=>artist))];
      _artist_list = _artist_list.filter((v) => v != null);
      
      let _art_list = [...new Set(result.Items.map(({art_name})=>art_name))];
      _art_list = _art_list.filter((v) => v != null);
      
      let _description_list = [...new Set(result.Items.map(({description})=>description))];
      _description_list = _description_list.filter((v) => v != null);
      
      let _title_list = [...new Set(result.Items.map(({title})=>title))];
      _title_list = _title_list.filter((v) => v != null);
      
      let _destination_list = [...new Set(result.Items.map(({destination})=>destination))];
      _destination_list = _destination_list.filter((v) => v != null);
      
      let _medium_list = [...new Set(result.Items.map(({medium})=>medium))];
      _medium_list = _medium_list.filter((v) => v != null);
       
      let _dimensions_list = [...new Set(result.Items.map(({dimensions})=>dimensions))];
      _dimensions_list = _dimensions_list.filter((v) => v != null);
      
      let _color_list = [...new Set(result.Items.map(({color})=>color))];
      _color_list = _color_list.filter((v) => v != null);
      
      let _response = {
        artist_list: _artist_list,
        art_list: _art_list,
        description_list: _description_list,
        title_list: _title_list,
        destination_list: _destination_list,
        medium_list: _medium_list,
        dimensions_list: _dimensions_list,
        color_list: _color_list
      };

      return Response(res, true, MESSAGE.RECORD_RETRIVED, _response);
    })
    .catch((error) => {
      // console.log('error => ', error);
      return Response(res, false, MESSAGE.RECORD_NOT_RETRIVED, error);
    });
  };
