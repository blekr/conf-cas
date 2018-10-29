/* eslint-disable no-undef */
import { addMessage, startNotify, stopNotify } from '../casNotify';
import { delay } from '../../utils';
import { notifyMessage } from '../../dao/confServer';
import logger from '../../logger';

jest.mock('../../dao/confServer');
jest.mock('../../logger');

logger.info.mockImplementation(msg => console.log(msg));
logger.error.mockImplementation(msg => console.log(msg));

describe('casNotify', () => {
  test('addMessage', async () => {
    startNotify();
    await addMessage({
      key: 'value',
    });
    await delay(3000);
    expect(notifyMessage.mock.calls.length).toBe(1);
    expect(notifyMessage.mock.calls[0][0].key).toBe('value');
    stopNotify();
  });
});
