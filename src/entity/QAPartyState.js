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
    state: {
      type: Number,
    },
    position: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

export const QAPartyState = mongoose.model('QAPartyState', schema);
