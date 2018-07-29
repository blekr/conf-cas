/* eslint-disable import/prefer-default-export */
import { CustomMessage } from '../entity/CustomMessage';

export function upsertCustomMessage({
  bridgeId,
  confId,
  customMessageNumber,
  status,
}) {
  return CustomMessage.updateOne(
    {
      bridgeId,
      confId,
      customMessageNumber,
    },
    {
      $set: {
        status,
      },
    },
    {
      upsert: true,
    },
  ).exec();
}
