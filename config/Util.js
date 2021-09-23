'use strict';

export const SetDirectoryPath = (dirname) => process.env.DIR_PATH = dirname

export const Response = (res, statuscode, status, messaege, data)=>{
    res.status(statuscode).json({
        status : status,
        messaege : messaege,
        data
    })
}