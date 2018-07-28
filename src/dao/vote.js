/* eslint-disable import/prefer-default-export */
import { Vote } from '../entity/Vote';

export function upsertVoteQuestion({ bridgeId, confId, question, choices }) {
  return Vote.updateOne(
    {
      bridgeId,
      confId,
      question,
    },
    {
      $set: {
        choices,
      },
    },
    {
      upsert: true,
    },
  ).exec();
}

export async function updateVoteTally({
  bridgeId,
  confId,
  tallyCompleted,
  noVotes,
  votes,
}) {
  const { _id } = await Vote.findOne({ bridgeId, confId })
    .sort({ createdAt: -1 })
    .exec();
  await Vote.updateOne(
    {
      _id,
    },
    {
      $set: {
        tallyCompleted,
        noVotes,
        votes,
      },
    },
  ).exec();
}
