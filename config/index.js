'use strict';
import pkg from 'mongoose';
const { model } = pkg;
import conn from './Configration.js'
const db = {}


db.Conn = conn

export default db