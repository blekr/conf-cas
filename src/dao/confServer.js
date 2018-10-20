/* eslint-disable prefer-rest-params,import/prefer-default-export */
import rp from 'request-promise';
import config from '../config';
import logger from '../logger';
import { str } from '../utils';

export async function notifyMessage({
  sessionId,
  sequence,
  messageId,
  nak,
  params,
  bridgeId,
  confId,
}) {
  const { confServer: { host, port } } = config;

  logger.info(
    `send message to conf-server ${host}:${port}: ${str(arguments[0])}`,
  );
  const result = await rp({
    uri: `http://${host}:${port}/sys/cas/params`,
    method: 'POST',
    headers: {
      'internal-key': config.internalKey,
    },
    body: {
      sessionId,
      sequence,
      messageId,
      nak,
      params,
      bridgeId,
      confId,
    },
    json: true,
    timeout: 8000,
  });

  logger.info(`notifyMessage: conf-server return: ${str(result)}`);
  return result;
}
