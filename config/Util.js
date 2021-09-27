'use strict';

exports.Response = (res, status_code, status, message, data = null) => res.status(status_code).json({
    status_code: status_code,
    status: status,
    message: message,
    data: data,
});