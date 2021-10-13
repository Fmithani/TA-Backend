'use strict';

exports.Response = (res, status, message, data = null, statusCode=200) => res.status(200).json({
    statusCode,
    status: status,
    message: message,
    data: data,
});