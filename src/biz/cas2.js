/* eslint-disable prefer-rest-params,no-underscore-dangle */
import { ServerError } from '../errors';
import config from '../config';
import logger from '../logger';
import { CASClient } from '../client/CASClient';
import { Message } from '../client/CASMessage';
import { assertTruth, str } from '../utils';
import { SessionManager } from '../utils/SessionManager';
import { ERROR_CODE } from '../constant';
import { notifyMessage } from '../dao/confServer';

let client;
let status = 'INIT'; // or CONNECTED, CLOSED
const sessionManager = new SessionManager();

export function getStatus() {
  return status;
}

export async function dumpSession() {
  return {
    sessions: sessionManager.sessions,
  };
}

function _sendMessage(message) {
  client.sendMessage(message);

  return new Promise((resolve, reject) => {
    let timer;
    function onResponse(responseMessage) {
      if (
        responseMessage.sessionId === message.sessionId &&
        responseMessage.sequence >= message.sequence
      ) {
        resolve({
          sessionId: responseMessage.sessionId,
          seqSent: message.sequence,
          seqReceived: responseMessage.sequence,
          messageId: responseMessage.messageId,
          nak: responseMessage.nak,
          params: responseMessage.params,
        });
        clearTimeout(timer);
        client.removeListener('message', onResponse);
        logger.info(
          `client sendMessage successfully: ${message} -> ${responseMessage}`,
        );
      }
    }
    client.on('message', onResponse);

    logger.info(`timer for waiting response is created: ${message}`);
    timer = setTimeout(() => {
      client.removeListener('message', onResponse);
      reject(
        new ServerError(
          `timeout waiting cas response for ${message.sessionId}, ${
            message.sequence
          }, ${message.messageId}`,
        ),
      );
      logger.info(`client sendMessage timeout: ${message}`);
    }, 5000);
  });
}

export async function sendMessage({
  bridgeId,
  confId,
  type,
  messageId,
  params,
}) {
  logger.info(`sendMessage biz: ${str(arguments[0])}`);

  if (!client) {
    throw new ServerError('client is not available');
  }
  const session = sessionManager.lookupSession({
    type,
    bridgeId,
    confId,
  });
  assertTruth({
    value: session,
    message: `ACC session not found, ${bridgeId}, ${confId}`,
    errorCode: ERROR_CODE.INVALID_PARAM,
  });

  const { sessionId } = session;
  const sequence = sessionManager.seq(sessionId);
  logger.info(
    `session found for ${type}, ${bridgeId}, ${confId}, sessionId: ${sessionId}, seq: ${sequence}`,
  );

  return _sendMessage(
    new Message()
      .sId(sessionId)
      .seq(sequence)
      .mId(messageId)
      .appendMulti(params),
  );
}

function createSession({ type, bridgeId, confId }) {
  if (sessionManager.lookupSession({ type, bridgeId, confId })) {
    logger.info(
      `${type} session already exists for conference: ${bridgeId}:${confId}`,
    );
    return;
  }
  logger.info(`create ${type} session for conference ${bridgeId}:${confId}`);

  const sequence = sessionManager.seq('0');
  client.sendMessage(
    new Message()
      .sId(0)
      .seq(sequence)
      .mId('LS.CS')
      .append(type)
      .append(bridgeId)
      .append(confId),
  );
  sessionManager.createSession({
    type,
    bridgeId,
    confId,
    creationSeq: sequence,
  });
}

function removeSession({ type, bridgeId, confId }) {
  const session = sessionManager.lookupSession({ type, bridgeId, confId });
  if (!session) {
    logger.warn(
      `removeSession: session not found, can not remove: ${type}, ${bridgeId}, ${confId}`,
    );
    return;
  }
  client.sendMessage(
    new Message()
      .sId(0)
      .seq(sessionManager.seq('0'))
      .mId('LS.DS')
      .append(session.sessionId),
  );
  sessionManager.deleteSession(session.sessionId);
}

async function onMessage(message) {
  const { confServer: { host, port } } = config;

  logger.info(`begin processing message: ${message.build()}`);

  // send every message to conf-server
  if (host && port) {
    // no wait
    const session = sessionManager.lookupSession({
      sessionId: message.sessionId,
    });
    notifyMessage({
      sessionId: message.sessionId,
      sequence: message.sequence,
      messageId: message.messageId,
      nak: message.nak,
      params: message.params,
      bridgeId: (session && session.bridgeId) || undefined,
      confId: (session && session.confId) || undefined,
    }).catch(err => {
      logger.error(`notifyMessage error: ${err.stack}`);
    });
  }

  // session is created: update sessionId to session manager
  if (message.sessionId === '0' && message.messageId === 'LS.CS') {
    const svcKey = message.params[0];
    const sessionId = message.params[1];
    if (!sessionId) {
      logger.warn(`sessionId is empty: ${sessionId}`);
      return;
    }
    logger.info(
      `updateSessionId: ${svcKey}, ${message.sequence}, ${sessionId}`,
    );
    sessionManager.updateSessionId({
      type: svcKey,
      creationSeq: message.sequence,
      sessionId,
    });
    return;
  }
  if (message.sessionId === '0' && message.messageId === 'LS.DS') {
    const sessionId = message.params[0];
    if (sessionId) {
      logger.info(`LS.DS: delete session: ${sessionId}`);
      sessionManager.deleteSession(sessionId);
    } else {
      logger.warn(`LS.DS: session is empty: ${sessionId}`);
    }
    return;
  }

  // active conference list: create ACV and ACC session
  if (message.messageId === 'BV.B.ACL') {
    const bridgeId = message.params[0];
    const m = message.params[1];
    const n = message.params[2];
    const confCount = message.params[3];
    logger.info(
      `receive active conference list: ${bridgeId}, ${m}:${n}, ${confCount}`,
    );
    for (let i = 0; i < confCount; i += 1) {
      const confId = message.params[4 + i * 7];
      createSession({ type: 'ACV', bridgeId, confId });
      createSession({ type: 'ACC', bridgeId, confId });
    }
    return;
  }

  // active conference added: create ACV and ACC session
  if (message.messageId === 'BV.B.AC.ADD') {
    const bridgeId = message.params[0];
    const confId = message.params[1];
    createSession({ type: 'ACV', bridgeId, confId });
    createSession({ type: 'ACC', bridgeId, confId });
    return;
  }

  // active conference removed: remove ACV and ACC session
  if (message.messageId === 'BV.B.AC.DEL') {
    const bridgeId = message.params[0];
    const confId = message.params[1];
    removeSession({ type: 'ACV', bridgeId, confId });
    removeSession({ type: 'ACC', bridgeId, confId });
  }
}

export async function startConnection({ index }) {
  if (client) {
    throw new ServerError('client already exists');
  }
  const { casList, casLicense } = config;
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

  let sequence = sessionManager.seq('0');
  await _sendMessage(
    new Message()
      .sId('0')
      .seq(sequence)
      .mId('LS.LICENSE')
      .append(casLicense),
  );
  status = 'CONNECTED';
  logger.info(`registry successfully`);

  sequence = sessionManager.seq('0');
  logger.info(`create bridge view session: ${sequence}`);
  sessionManager.createSession({
    type: 'BV',
    bridgeId: null,
    confId: null,
    creationSeq: sequence,
  });
  await _sendMessage(
    new Message()
      .sId('0')
      .seq(sequence)
      .mId('LS.CS')
      .append('BV'),
  );
  logger.info(`bridge view session created successfully`);
}

export async function stopConnection() {
  logger.info(`stop connection: ${!!client}`);
  if (client) {
    client.removeListener('message', onMessage);
    client.close();
    client = null;
    status = 'CLOSED';
    logger.info('connection is stopped, exit now ...');
    process.exit();
  }
}
