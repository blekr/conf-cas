/* eslint-disable import/prefer-default-export */
import { Conference } from '../entity/Conference';

export function upsertConference({
  bridgeId,
  confId,
  name,
  key,
  mainConfID,
  subConfNumber,
  partition,
}) {
  return Conference.findOneAndUpdate(
    { bridgeId, confId },
    {
      $set: {
        name,
        key,
        mainConfID,
        subConfNumber,
        partition,
        deleted: false,
      },
    },
    { upsert: true },
  ).exec();
}

export async function removeObsConference({ bridgeId, date }) {
  return Conference.updateMany(
    { bridgeId, updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}

export function removeConference({ bridgeID, confId }) {
  return Conference.updateOne(
    { bridgeID, confId },
    { $set: { deleted: true } },
  ).exec();
}

export function updateConferenceAttr({ bridgeId, confId, type, attr }) {
  return Conference.updateOne(
    {
      bridgeId,
      confId,
    },
    {
      $set: {
        attr: {
          [type]: attr,
        },
      },
    },
  ).exec();
}
