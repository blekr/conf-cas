/* eslint-disable import/prefer-default-export */
import { ServiceList } from '../entity/ServiceList';

export function upsert({ key, name, version }) {
  return ServiceList.findOneAndUpdate(
    { key },
    { $set: { name, version } },
    { upsert: true },
  ).exec();
}

export function removeObs(date) {
  return ServiceList.deleteMany({ updatedAt: { $lt: date } }).exec();
}
