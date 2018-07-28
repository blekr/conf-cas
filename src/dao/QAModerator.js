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

export async function removeObsQAModerator(date) {
  return QAModerator.updateMany(
    { updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}
