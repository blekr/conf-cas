/* eslint-disable import/prefer-default-export */
import { Bridge } from '../entity/Bridge';

export function upsertBridge(bridgeId) {
  return Bridge.findOneAndUpdate(
    { bridgeId },
    { $set: { deleted: false } },
    { upsert: true },
  ).exec();
}

export async function removeObsBridge(date) {
  return Bridge.deleteMany({ updatedAt: { $lt: date } }).exec();
}

export function removeBridgeById(bridgeId) {
  return Bridge.updateOne({ bridgeId }, { $set: { deleted: true } }).exec();
}

export function updateBridge({ bridgeId, attrs }) {
  return Bridge.updateOne({ bridgeId }, { $set: attrs }).exec();
}
