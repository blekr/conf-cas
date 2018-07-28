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
    question: {
      type: String,
      required: true,
      index: true,
    },
    choices: [String], // length === 9
    votes: [Number], // length === 9
    noVotes: Number,
    tallyCompleted: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

export const Vote = mongoose.model('Vote', schema);
