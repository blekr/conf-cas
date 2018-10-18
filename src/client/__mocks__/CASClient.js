/* eslint-disable no-undef,import/prefer-default-export */
import EventEmitter from 'events';

export const sendMessage = jest.fn();
export const emitter = new EventEmitter();

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
