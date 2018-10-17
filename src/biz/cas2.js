/* eslint-disable prefer-rest-params */
import { ServerError } from '../errors';
import config from '../config';
import logger from '../logger';
import { CASClient, Message } from '../client/CASClient';
import { str } from '../utils';

let client;
let status = 'INIT'; // or CONNECTED, CLOSED

export function getStatus() {
  return status;
}

async function onMessage(message) {
  // const { confServer: { host, port } } = config;
  // if (message.params.length === 1 && message.params[0] === 'LT') {
  //   client.sendMessage(new Message(['LT']));
  //   return;
  // }
  // logger.info(`<-- ${message.params.join('~')}`);
  //
  // if (host && port) {
  //   logger.info(`sending message to conf-service service: ${host}:${port}`);
  //   const result = await rp({
  //     uri: `http://${host}:${port}/sys/rtbi/params`,
  //     method: 'POST',
  //     headers: {
  //       'internal-key': config.internalKey,
  //     },
  //     body: {
  //       params: message.params,
  //     },
  //     json: true,
  //     timeout: 8000,
  //   });
  //   logger.info(`conf-service return: ${str(result)}`);
  // }
}

export async function startConnection({ index }) {
  if (client) {
    throw new ServerError('client already exists');
  }
  const { casList } = config;
  const { host, port } = casList[index % casList.length];

  logger.info(`start connection: index: ${index}, ${host}:${port}`);

  client = new CASClient({ host, port });
  client.on('message', onMessage);
  client.on('close', () => {
    status = 'CLOSED';
    logger.error(
      `received close event, exit now. arguments: ${str(arguments)}`,
    );
    process.exit();
  });
  await client.connect();

  logger.info('connection established');

  status = 'CONNECTED';
}

export async function stopConnection() {
  if (client) {
    client.removeListener('message', onMessage);
    client.close();
    client = null;
    status = 'CLOSED';
    logger.info('connection is stopped, exit now ...');
    process.exit();
  }
}
