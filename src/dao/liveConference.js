/* eslint-disable import/prefer-default-export */

import { LiveConference } from '../entity/LiveConference';

export function upsertLiveConference({
  bridgeId,
  confId,
  hostCode,
  guestCode,
  billingCode,
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
        billingCode,
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

export function removeLiveConference({ bridgeId, confId }) {
  return LiveConference.updateOne(
    { bridgeId, confId },
    { $set: { deleted: true } },
  ).exec();
}
