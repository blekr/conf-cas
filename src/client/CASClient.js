/* eslint-disable no-bitwise,no-underscore-dangle,import/prefer-default-export */
import EventEmitter from 'events';
import net from 'net';
import logger from '../logger';
import { Message } from './CASMessage';

export class CASClient extends EventEmitter {
  constructor({ host, port }) {
    super();
    this.options = {
      host,
      port,
    };
    this.client = null;
    this.received = Buffer.alloc(0);
  }

  static __XORSUM(message) {
    const sum = Buffer.from([0x0]);
    const msgBuffer = Buffer.from(message);
    for (let i = 0; i < msgBuffer.length; i += 1) {
      sum[0] ^= msgBuffer[i];
    }
    sum[0] &= 0x7f;
    return sum.toString('hex', 0, 1).toUpperCase();
  }

  static __BYTESUM(message) {
    const sum = Buffer.from([0x0]);
    const msgBuffer = Buffer.from(message);
    for (let i = 0; i < msgBuffer.length; i += 1) {
      sum[0] += msgBuffer[i];
    }
    sum[0] &= 0x7f;
    return sum.toString('hex', 0, 1).toUpperCase();
  }

  __onData(data) {
    if (data instanceof Buffer) {
      this.received = Buffer.concat([this.received, data]);
    } else {
      this.received = Buffer.concat([this.received, Buffer.from(data)]);
    }

    while (true) {
      const start = this.received.indexOf('02', 0, 'hex');
      if (start < 0) {
        break;
      }
      const end = this.received.indexOf('03', start, 'hex');
      if (end < 0) {
        break;
      }
      const msg = this.received.toString('utf8', start + 1, end).slice(0, -4);
      const message = Message.fromMsg(msg);
      this.received = this.received.slice(end + 1);
      this.emit('message', message);
      logger.info(`<-- ${msg}`);
    }
  }

  connect() {
    const { host, port } = this.options;
    this.client = new net.Socket();
    this.client.connect(port, host);
    this.client.on('data', data => this.__onData(data));

    this.client.on('close', hadError => {
      logger.error(
        `connection to ${host}:${port} closed, hadError: ${hadError}`,
      );
      this.emit('close', hadError);
    });
    this.client.on('error', err =>
      logger.error(`connection error: ${err.stack}`),
    );

    return new Promise((resolve, reject) => {
      this.client.once('connect', resolve);
      this.client.once('error', reject);
    });
  }

  sendMessage(message) {
    const msg = message.build();
    const xorSum = CASClient.__XORSUM(msg);
    const byteSum = CASClient.__BYTESUM(msg);

    const pkg = `\x02${msg}${xorSum}${byteSum}\x03`;
    this.client.write(pkg);
    logger.info(`--> ${msg}`);
  }

  close() {
    this.client.destroy();
  }

  // helpers
  // getVersion() {
  //   return new Promise(resolve => {
  //     function onMessage(message) {
  //       if (message.__sessionId === 0 && message.__messageId === 'LS.VER') {
  //         resolve(message.__params[0]);
  //         this.removeListener('message', onMessage);
  //       }
  //     }
  //     const message = new Message().sId(0).mId('LS.VER');
  //     this.sendMessage(message);
  //     this.on('message', onMessage);
  //   });
  // }
}
