/* eslint-disable import/prefer-default-export */
import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    bridgeId: {
      type: String,
      required: true,
      index: true,
    },
    confId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      index: true,
    },
    key: {
      type: String,
      index: true,
      required: true,
      unique: true,
    },
    mainConfID: {
      type: String,
      index: true,
    },
    subConfNumber: {
      type: Number,
    },
    partition: {
      type: Number,
    },
    deleted: {
      type: Boolean,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ bridgeId: 1, confId: 1 }, { unique: true });

export const Conference = mongoose.model('Conference', schema);
