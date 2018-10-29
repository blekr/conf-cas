/* eslint-disable no-await-in-loop */
import { notifyMessage } from '../dao/confServer';
import logger from '../logger';

const queue = [];
let timer;

async function consumer() {
  while (true) {
    const message = queue.pop();
    if (!message) {
      break;
    }
    try {
      await notifyMessage(message);
    } catch (err) {
      logger.error(`notifyMessage error: ${err.stack}`);
    }
  }
  timer = setTimeout(consumer, 1000);
}
export function startNotify() {
  timer = setTimeout(consumer, 1000);
}

export function stopNotify() {
  clearTimeout(timer);
}

export function addMessage(message) {
  queue.unshift(message);
}
