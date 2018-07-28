/* eslint-disable import/prefer-default-export */
import { Participant } from '../entity/Participant';

export function upsertParticipant({ bridgeId, confId, partyId, partyName }) {
  return Participant.findOneAndUpdate(
    { bridgeId, confId, partyId },
    {
      $set: {
        partyName,
        deleted: false,
      },
    },
    { upsert: true },
  ).exec();
}

export function removeParticipant({ bridgeId, confId, partyId }) {
  return Participant.updateOne(
    { bridgeId, confId, partyId },
    { $set: { deleted: true } },
  ).exec();
}

export async function removeObsParticipant(date) {
  return Participant.updateMany(
    { updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}

export function updateParticipantAttr({
  bridgeId,
  confId,
  partyId,
  type,
  attr,
}) {
  return Participant.updateOne(
    {
      bridgeId,
      confId,
      partyId,
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
