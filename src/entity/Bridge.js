/* eslint-disable import/prefer-default-export */
import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    bridgeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    state: {
      type: Number,
    },
    name: {
      type: String,
    },
    type: {
      type: String,
    },
    unicodeSupportLevel: {
      type: Number,
    },
    allowSelectPlayback: {
      type: Number,
    },
    mixedUnicodeEnabled: {
      type: Number,
    },
    partitions: [
      {
        partitionIndex: Number,
        partitionLabel: String,
        isEnabled: Number,
        isDefault: Number,
        maxPorts: Number,
        dialGroup: Number,
        dialGroupType: Number,
      },
    ],
    deleted: {
      type: Boolean,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Bridge = mongoose.model('Bridge', schema);
