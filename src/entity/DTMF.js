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
    partyId: {
      type: String,
      required: true,
      index: true,
    },
    DTMF: {
      type: String,
    },
    summitPortID: {
      type: String,
    },
    partyName: {
      type: String,
    },
    partyPhone: {
      type: String,
    },
    partyPcode: {
      type: String,
    },
    confHostPcode: {
      type: String,
    },
    confGuestPcode: {
      type: String,
    },
    confBillCode: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

export const DTMF = mongoose.model('DTMF', schema);
