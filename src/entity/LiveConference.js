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
    hostCode: {
      type: String,
    },
    guestCode: {
      type: String,
    },
    accountNumber: {
      type: String,
    },
    confActivationTime: {
      type: String,
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

export const LiveConference = mongoose.model('LiveConference', schema);
