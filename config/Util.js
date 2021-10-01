'use strict';

exports.Response = (res, status, message, data = null) => res.status(200).json({
    statusCode: 200,
    status: status,
    message: message,
    data: data,
});