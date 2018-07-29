/* eslint-disable import/prefer-default-export */

import { LiveConference } from '../entity/LiveConference';

export function upsertLiveConference({
  bridgeId,
  confId,
  hostCode,
  guestCode,
  accountNumber,
  confActivationTime,
  partition,
}) {
  return LiveConference.updateOne(
    { bridgeId, confId },
    {
      $set: {
        hostCode,
        guestCode,
        accountNumber,
        confActivationTime,
        partition,
        deleted: false,
      },
    },
    { upsert: true },
  ).exec();
}

export async function removeObsLiveConference({ bridgeId, date }) {
  return LiveConference.updateMany(
    { bridgeId, updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}

export function removeLiveConference({ bridgeID, confId }) {
  return LiveConference.updateOne(
    { bridgeID, confId },
    { $set: { deleted: true } },
  ).exec();
}
