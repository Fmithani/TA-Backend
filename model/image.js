var AWS = require("aws-sdk");
const isDev = process.env.NODE_ENV !== 'production';
const config = require('../config/config');
const tables = require('../config/tables');

exports.createImageTable = async () => {

if (isDev) {
    AWS.config.update(config.aws_local_config);
  } else {
    AWS.config.update(config.aws_remote_config);
  }

var dynamodb = new AWS.DynamoDB();

var params = {
    TableName : tables.IMAGES,
    KeySchema : [ {
        AttributeName : "_id",
        KeyType : "HASH"
    },
    ],
    AttributeDefinitions : [ {
        AttributeName : "_id",
        AttributeType : "S"
    }],
    ProvisionedThroughput : {
        ReadCapacityUnits : 10,
        WriteCapacityUnits : 10
    }
};

dynamodb.createTable(params, function(err, data) {

    if (err) {
        if (err.code === "ResourceInUseException") {
            console.log("message ====>" + err.message);
        } else {
            console.error("Unable to create table. Error JSON:", JSON
                    .stringify(err, null, 2));
        }

    } else {
        console.log("Created table, " + tables.IMAGES);
    }
});
}