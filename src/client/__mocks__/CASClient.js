/* eslint-disable no-undef,import/prefer-default-export */
import EventEmitter from 'events';
import { Message } from '../CASMessage';

export const emitter = new EventEmitter();
export const sendMessage = jest.fn().mockImplementation(message => {
  if (message.messageId === 'LS.VER') {
    console.log('received LS.VER');
    emitter.emit(
      'message',
      new Message()
        .sId(message.sessionId)
        .seq(message.sequence)
        .mId('LS.VER'),
    );
  }
});

export const CASClient = jest.fn().mockImplementation(() => ({
  connect: () => Promise.resolve(),
  sendMessage,
  on: (event, fn) => {
    emitter.on(event, fn);
  },
  removeListener: (event, fn) => {
    emitter.removeListener(event, fn);
  },
}));
