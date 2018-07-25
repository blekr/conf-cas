/* eslint-disable import/prefer-default-export */
import mongoose from 'mongoose';
import config from '../config';

export function connectMongoDB() {
  mongoose.connect(config.mongoDB);
}
