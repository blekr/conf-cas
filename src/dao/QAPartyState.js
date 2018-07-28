/* eslint-disable import/prefer-default-export */
import { QAPartyState } from '../entity/QAPartyState';

export function upsertQAPartyState({
  bridgeId,
  confId,
  partyId,
  state,
  position,
}) {
  return QAPartyState.updateOne(
    {
      bridgeId,
      confId,
      partyId,
    },
    { $set: { state, position } },
    { upsert: true },
  ).exec();
}
