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

export async function removeObsQAQueue(date) {
  return QAQueue.updateMany(
    { updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}
