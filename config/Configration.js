'use strict';
import { URI, POOL } from './Connection.js'
import mongoose from 'mongoose'

mongoose.connect(URI, POOL).then(
  console.log(`Connection Exstablised in PORT: ${process.env.PORT || 3000}`)
  ).catch(err=>console.log(err));

const conn = mongoose.connection;
conn.on('error', console.error.bind(console, `connection error:`));
conn.once('open', () => {
  console.log(`MongoDb Connected Successfully`)
});

export default conn