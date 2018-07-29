import { QAModerator } from '../entity/QAModerator';

export function upsertQAModerator({ bridgeId, confId, partyId }) {
  return QAModerator.updateOne(
    {
      bridgeId,
      confId,
      partyId,
    },
    { $set: { deleted: false } },
    { upsert: true },
  ).exec();
}

export async function removeObsQAModerator({ bridgeId, confId, date }) {
  return QAModerator.updateMany(
    { bridgeId, confId, updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}
