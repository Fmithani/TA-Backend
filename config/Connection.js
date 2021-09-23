'use strict';
import Dotenv from 'dotenv'
const dotenv = Dotenv.config()

export const URI = `${process.env.DILET}://${process.env.HOST}/${process.env.DATABASE}`

export const POOL  =  {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            }
