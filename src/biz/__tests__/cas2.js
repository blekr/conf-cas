/* eslint-disable no-undef */
import config from '../../config';
import {
  sendMessage as CASClientSendMessage,
  emitter,
} from '../../client/CASClient';
import {
  dumpSession,
  refreshConferenceAttributes,
  refreshConferenceList,
  sendMessage,
  startConnection,
  startKeepAlive,
  stopKeepAlive,
} from '../cas2';
import logger from '../../logger';
import { Message } from '../../client/CASMessage';
import { delay, getJTestExtend } from '../../utils';

jest.mock('../../logger');
jest.mock('../../client/CASClient');
expect.extend(getJTestExtend());

logger.info.mockImplementation(msg => console.log(msg));
logger.error.mockImplementation(msg => console.log(msg));

config.casList = ['host', 'port'];

beforeEach(() => {
  // Clear all instances and calls to constructor and all methods:
  CASClientSendMessage.mockClear();
});

describe('cas biz', () => {
  test('on start, a bridge view session is created', async () => {
    setTimeout(async () => {
      emitter.emit(
        'message',
        new Message()
          .sId('0')
          .seq(1)
          .mId('LS.LICENSE'),
      );
      await delay(1000);
      emitter.emit(
        'message',
        new Message()
          .sId('0')
          .seq(2)
          .mId('LS.CS')
          .append('BV')
          .append('sessionIdBV'),
      );
    }, 2000);

    await startConnection({ index: 1 });
    expect(CASClientSendMessage.mock.calls.length).toBe(2);
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('LS.LICENSE');
    expect(CASClientSendMessage.mock.calls[1][0].messageId).toBe('LS.CS');
    const { sessions } = await dumpSession();
    expect(sessions.length).toBe(2);
    expect(sessions[1].type).toBe('BV');
  });

  test('on active conference list, sessions are created', async () => {
    emitter.emit(
      'message',
      new Message()
        .sId('100')
        .seq(1)
        .mId('BV.B.ACL')
        .appendMulti([
          'bridgeId0',
          '1',
          '1',
          '1',
          'confId0',
          'confName0',
          'confKey0',
          'groupKey0',
          'mainConfId0',
          'subConfNumber0',
          'partition0',
        ]),
    );
    expect(CASClientSendMessage.mock.calls.length).toBe(2);
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('LS.CS');
    expect(CASClientSendMessage.mock.calls[0][0].params[0]).toBe('ACV');
    expect(CASClientSendMessage.mock.calls[1][0].messageId).toBe('LS.CS');
    expect(CASClientSendMessage.mock.calls[1][0].params[0]).toBe('ACC');

    const { sessions } = await dumpSession();
    expect(sessions.length).toBe(4);
  });

  test('on ACV session created, TalkerUpdatesEnabled is enabled', async () => {
    emitter.emit(
      'message',
      new Message()
        .sId('0')
        .seq(3)
        .mId('LS.CS')
        .append('ACV')
        .append('sessionIdACV'),
    );
    await delay(10);
    expect(CASClientSendMessage.mock.calls[0][0].sessionId).toBe(
      'sessionIdACV',
    );
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe(
      'ACV.SA.ALTER',
    );
  });

  test('on ACC session created, sessionId is updated', async () => {
    let dump = await dumpSession();
    expect(dump.sessions[3].sessionId).toBe(null);
    emitter.emit(
      'message',
      new Message()
        .sId('0')
        .seq(4)
        .mId('LS.CS')
        .append('ACC')
        .append('sessionIdACC'),
    );
    dump = await dumpSession();
    expect(dump.sessions[3].sessionId).toBe('sessionIdACC');
  });

  test('sendMessage() fail: timeout', async () => {
    const result = sendMessage({
      bridgeId: 'bridgeId0',
      confId: 'confId0',
      type: 'ACC',
      messageId: 'anything',
      params: [],
    });
    await expect(result).rejects.toThrowError(/timeout waiting/);
    // expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('anything');
    // expect(CASClientSendMessage.mock.calls[0][0].sessionId).toBe(1);
  });

  test('sendMessage() success', async () => {
    setTimeout(() => {
      emitter.emit(
        'message',
        new Message()
          .sId('sessionIdACC')
          .seq(100)
          .mId('anything'),
      );
    }, 2000);
    const result = await sendMessage({
      bridgeId: 'bridgeId0',
      confId: 'confId0',
      type: 'ACC',
      messageId: 'anything',
      params: [],
    });
    expect(result.messageId).toBe('anything');
    expect(CASClientSendMessage.mock.calls.length).toBe(1);
    expect(CASClientSendMessage.mock.calls[0][0].sessionId).toBe(
      'sessionIdACC',
    );
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('anything');
  });

  test('on session destroyed, session is removed', async () => {
    emitter.emit(
      'message',
      new Message()
        .sId('0')
        .seq(0)
        .mId('LS.DS')
        .append('sessionIdACC'),
    );
    const dump = await dumpSession();
    expect(dump.sessions.length).toBe(3);
  });

  test('after 6s, a keep alive is sent, and lastKeepAlive is set correctly', async () => {
    startKeepAlive();
    await delay(6000);
    const dumped = await dumpSession();
    expect(dumped.lastKeepAlive).toBeTruthy();
    stopKeepAlive();
  });

  test('when refreshConferenceList called, BV.B.ACL is sent', async () => {
    setTimeout(() => {
      emitter.emit(
        'message',
        new Message()
          .sId('sessionIdBV')
          .seq(100)
          .mId('BV.B.ACL'),
      );
    }, 2000);
    await refreshConferenceList();
    expect(CASClientSendMessage.mock.calls.length).toBe(1);
    expect(CASClientSendMessage.mock.calls[0][0].sessionId).toBe('sessionIdBV');
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('BV.B.ACL');
  });

  test('when refreshConferenceAttributes called', async () => {
    const result = await refreshConferenceAttributes();
    expect(result.count).toBe(1);
    expect(CASClientSendMessage.mock.calls.length).toBe(1);
    expect(CASClientSendMessage.mock.calls[0][0].sessionId).toBe(
      'sessionIdACV',
    );
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('ACV.A');
  });
});
