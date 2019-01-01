/* eslint-disable prefer-rest-params,no-underscore-dangle,prefer-destructuring,no-plusplus */
import { ServerError } from '../errors';
import config from '../config';
import logger from '../logger';
import { CASClient } from '../client/CASClient';
import { Message } from '../client/CASMessage';
import { assertTruth, delay, str } from '../utils';
import { SessionManager } from '../utils/SessionManager';
import { ERROR_CODE } from '../constant';
import { addMessage } from './casNotify';

let client;
let status = 'INIT'; // or CONNECTED, CLOSED
let interval;
let lastKeepAlive;
const sessionManager = new SessionManager();
let defaultBridgeId;

function sendAndCheckKeepAlive() {
  const sequence = sessionManager.seq('0');
  client.sendMessage(
    new Message()
      .sId('0')
      .seq(sequence)
      .mId('LS.VER'),
  );
  if (
    lastKeepAlive &&
    new Date().getTime() - lastKeepAlive.getTime() > 35 * 1000
  ) {
    logger.error(
      `do not receive keep alive in 35s, now ${new Date()}, lastKeepAlive: ${lastKeepAlive}`,
    );
    status = 'CLOSED';
    process.exit();
  }
}

export function getStatus() {
  return status;
}

export async function dumpSession() {
  return {
    sessions: sessionManager.sessions,
    lastKeepAlive,
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

function createSession({ type, bridgeId, confId }) {
  const session = sessionManager.lookupSession({ type, bridgeId, confId });
  if (session) {
    logger.info(
      `${type} session already exists for conference: ${bridgeId}:${confId}, session: ${str(
        session,
      )}`,
    );
    return;
  }
  logger.info(`create ${type} session for conference ${bridgeId}:${confId}`);

  const sequence = sessionManager.seq('0');
  client.sendMessage(
    new Message()
      .sId('0')
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

export async function activateConference({
  hostPasscode,
  guessPasscode,
  DNIS,
}) {
  logger.info(`activateConference biz: ${str(arguments[0])}`);
  assertTruth({
    value: defaultBridgeId,
    message: `defaultBridgeId is null`,
    serverError: true,
  });

  const sequence = sessionManager.seq('0');

  logger.info(
    `activateConference biz: create ACC session of confId 0: ${hostPasscode}:${guessPasscode}, ${defaultBridgeId}`,
  );
  const { nak, params } = await _sendMessage(
    new Message()
      .sId('0')
      .seq(sequence)
      .mId('LS.CS')
      .append('ACC')
      .append(defaultBridgeId)
      .append('0'),
  );
  assertTruth({
    value: !nak,
    message: `activateConference biz: cas returned nak: ${hostPasscode}:${guessPasscode}, ${str(
      params,
    )}`,
    serverError: true,
  });

  logger.info(
    `activateConference biz: send ACC.C.ACTIVATE message: ${hostPasscode}:${guessPasscode}, ${
      params[1]
    }`,
  );

  await delay(1000);

  await _sendMessage(
    new Message()
      .sId(params[1])
      .seq(1)
      .mId('ACC.C.ACTIVATE')
      .append(defaultBridgeId)
      .append(hostPasscode)
      .append(guessPasscode)
      .append('1')
      .append('0')
      .append(DNIS || ''),
  );

  await delay(1000);

  logger.info(
    `activateConference biz: destroy session: ${hostPasscode}:${guessPasscode}, ${
      params[1]
    }`,
  );
  await _sendMessage(
    new Message()
      .sId('0')
      .seq(sessionManager.seq('0'))
      .mId('LS.DS')
      .append(params[1]),
  );
  logger.info(
    `activateConference biz: finished: ${hostPasscode}:${guessPasscode}`,
  );
  return {
    sessionId: params[1],
  };
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
  if (host && port && message.messageId !== 'LS.VER') {
    const session = sessionManager.lookupSession({
      sessionId: message.sessionId,
    });
    addMessage({
      sessionId: message.sessionId,
      sequence: message.sequence,
      messageId: message.messageId,
      nak: message.nak,
      params: message.params,
      bridgeId: (session && session.bridgeId) || undefined,
      confId: (session && session.confId) || undefined,
    });
  }

  if (message.messageId === 'LS.VER') {
    lastKeepAlive = new Date();
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
    if (
      !sessionManager.updateSessionId({
        type: svcKey,
        creationSeq: message.sequence,
        sessionId,
      })
    ) {
      logger.info(
        `fail to update sessionId, return now: ${
          message.sequence
        }, ${sessionId}`,
      );
      return;
    }
    if (svcKey === 'ACV') {
      const sequence = sessionManager.seq(sessionId);
      logger.info(
        `enable TalkerUpdatesEnabled for ACV session ${sessionId}, seq: ${sequence}`,
      );
      client.sendMessage(
        new Message()
          .sId(sessionId)
          .seq(sequence)
          .mId('ACV.SA.ALTER')
          .append('TalkerUpdatesEnabled')
          .append('1'),
      );
    }
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
    /*
     * why setTimeout:
     * @Blekr 昨天那个LS.ERR~SSN问题是这样的：有一个会议在桥上启动，CAS会发BVBV.B.AC.ADD给你，接着CAS就发一条ConferenceQueryState给桥去取这个会议的一些状态。然后你那边用LS.CS~ACV，CAS就把会议的状态发给你。我对比working vs not working 例子，有时CAS在ConferenceQueryState时得到回复在你用LS.CS~ACV之后，就会出现错误。
     * 报错原因可能有问题，我让开发组看看，我们会在以后版本里改，但是版本出得比较慢。现在要解决问题，就看看你那边能不能查一下你为什么发送的BV消息，这个肯定不对。还有就是可以LS.CS~ACV能不能加点延迟再发（这个方法好像不怎么好）。或者你检查到你发了LS.CS~ACV后，如果没有得到ACV.A～1，ACV.A～2的回复就重新创建ACV
     */
    setTimeout(() => {
      createSession({ type: 'ACV', bridgeId, confId });
      createSession({ type: 'ACC', bridgeId, confId });
    }, 2000);
    return;
  }

  // active conference removed: remove ACV and ACC session
  if (message.messageId === 'BV.B.AC.DEL') {
    const bridgeId = message.params[0];
    const confId = message.params[1];
    removeSession({ type: 'ACV', bridgeId, confId });
    removeSession({ type: 'ACC', bridgeId, confId });
    return;
  }

  if (message.messageId === 'BV.BL') {
    defaultBridgeId = message.params[3];
    // eslint-disable-next-line no-useless-return
    return;
  }
}

export async function refreshConferenceList() {
  logger.info(`refreshConferenceList biz: no arguments`);
  const session = sessionManager.lookupSession({ type: 'BV' });
  if (!session) {
    throw new ServerError('refreshConferenceList biz: BV session not found');
  }
  const { sessionId } = session;
  const sequence = sessionManager.seq(sessionId);
  logger.info(
    `refreshConferenceList biz: send BV.B.ACL: ${sessionId}:${sequence}`,
  );
  return _sendMessage(
    new Message()
      .sId(sessionId)
      .seq(sequence)
      .mId('BV.B.ACL'),
  );
}

export async function refreshConferenceAttributes() {
  logger.info(`refreshConferenceAttributes biz: no arguments`);
  let count = 0;
  sessionManager.sessions.forEach(({ type, bridgeId, confId, sessionId }) => {
    if (type !== 'ACV') {
      return;
    }
    if (!sessionId || !bridgeId || !confId) {
      logger.info(
        `refreshConferenceAttributes biz: skip session: ${sessionId}:${bridgeId}:${confId}`,
      );
      return;
    }

    const sequence = sessionManager.seq(sessionId);
    client.sendMessage(
      new Message()
        .sId(sessionId)
        .seq(sequence)
        .mId('ACV.A'),
    );
    count++;
  });

  logger.info(
    `refreshConferenceAttributes biz: refresh ${count}/${
      sessionManager.sessions.length
    } sessions`,
  );
  return { count, total: sessionManager.sessions.length };
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

export function startKeepAlive() {
  interval = setInterval(sendAndCheckKeepAlive, 5000);
}

export function stopKeepAlive() {
  clearInterval(interval);
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
