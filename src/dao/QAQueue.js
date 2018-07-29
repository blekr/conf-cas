import { QAQueue } from '../entity/QAQueue';

export function upsertQAQueue({ bridgeId, confId, partyId }) {
  return QAQueue.updateOne(
    {
      bridgeId,
      confId,
      partyId,
    },
    { $set: { deleted: false } },
    { upsert: true },
  ).exec();
}

export async function removeObsQAQueue({ bridgeId, confId, date }) {
  return QAQueue.updateMany(
    { bridgeId, confId, updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}
