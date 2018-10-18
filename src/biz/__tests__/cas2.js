/* eslint-disable no-undef */
import config from '../../config';
import {
  sendMessage as CASClientSendMessage,
  emitter,
} from '../../client/CASClient';
import { dumpSession, sendMessage, startConnection } from '../cas2';
import logger from '../../logger';
import { Message } from '../../client/CASMessage';
import { getJTestExtend } from '../../utils';

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
    await startConnection({ index: 1 });
    expect(CASClientSendMessage.mock.calls.length).toBe(1);
    expect(CASClientSendMessage.mock.calls[0][0].messageId).toBe('LS.CS');
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

  test('on session created, sessionId is updated', async () => {
    let dump = await dumpSession();
    expect(dump.sessions[3].sessionId).toBe(null);
    emitter.emit(
      'message',
      new Message()
        .sId(0)
        .seq(3)
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
          .seq(4)
          .mId('anything'),
      );
    }, 2000);
    const result = await sendMessage({
      bridgeId: 'bridgeId0',
      confId: 'confId0',
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
        .sId(0)
        .seq(0)
        .mId('LS.DS')
        .append('sessionIdACC'),
    );
    const dump = await dumpSession();
    expect(dump.sessions.length).toBe(3);
  });
});
