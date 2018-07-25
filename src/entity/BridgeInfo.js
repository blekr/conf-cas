/* eslint-disable import/prefer-default-export */
import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    key: {
      type: String,
      required: true,
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  },
);

export const BridgeInfo = mongoose.model('BridgeInfo', schema);
