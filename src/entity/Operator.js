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
    operatorId: {
      type: String,
      required: true,
    },
    operatorName: {
      type: String,
    },
    attr: {
      1: {
        operName: String,
        type: Number,
        vestibuleID: Number,
        viaPartyID: String,
      },
      2: {
        connectState: Number,
        crntLocID: Number,
        crntConfID: Number,
      },
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

export const Operator = mongoose.model('Operator', schema);
