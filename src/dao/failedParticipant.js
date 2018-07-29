/* eslint-disable import/prefer-default-export */
import { FailedParticipant } from '../entity/FailedParticipant';

export function upsertFailParticipant({
  bridgeId,
  confId,
  partyId,
  blackListedNumber,
}) {
  return FailedParticipant.updateOne(
    {
      bridgeId,
      confId,
      partyId,
    },
    {
      $set: {
        blackListedNumber,
      },
    },
    {
      upsert: true,
    },
  ).exec();
}
