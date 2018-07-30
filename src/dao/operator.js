import { Operator } from '../entity/Operator';

export function upsertOperator({ bridgeId, operatorId, operatorName }) {
  return Operator.updateOne(
    { bridgeId, operatorId },
    {
      $set: {
        operatorName,
        deleted: false,
      },
    },
    { upsert: true },
  ).exec();
}

export async function removeObsOperator({ bridgeId, date }) {
  return Operator.updateMany(
    { bridgeId, updatedAt: { $lt: date } },
    { $set: { deleted: true } },
  ).exec();
}

export function removeOperator({ bridgeId, operatorId }) {
  return Operator.updateOne(
    { bridgeId, operatorId },
    { $set: { deleted: true } },
  ).exec();
}

export function updateOperatorAttr({ bridgeId, operatorId, type, attr }) {
  return Operator.updateOne(
    {
      bridgeId,
      operatorId,
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
