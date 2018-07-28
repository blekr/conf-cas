/* eslint-disable import/prefer-default-export */
import { QAFloorParty } from '../entity/QAFloorParty';

export function upsertQAFloorParty({ bridgeId, confId, partyId }) {
  return QAFloorParty.updateOne(
    {
      bridgeId,
      confId,
    },
    { $set: { partyId } },
    { upsert: true },
  ).exec();
}
