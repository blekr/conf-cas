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
    customMessageNumber: {
      type: Number,
    },
    status: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

export const CustomMessage = mongoose.model('CustomMessage', schema);
