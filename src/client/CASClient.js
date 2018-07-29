/* eslint-disable no-bitwise,no-underscore-dangle */
import EventEmitter from 'events';
import net from 'net';

// msg is string representation of Message instance
export class Message {
  static fromMsg(msg) {
    const items = msg.split('~');
    const [sId, seq, mId, ...rest] = items;
    const nak = mId[0] === '-';
    const replaced = mId.replace('-', '');
    return new Message()
      .sId(sId)
      .seq(parseInt(seq, 10))
      .mId(replaced)
      .naked(nak)
      .appendMulti(rest);
  }
  constructor() {
    this.params = [];
  }
  sId(sessionId) {
    this.sessionId = sessionId;
    return this;
  }

  seq(sequence) {
    this.sequence = sequence;
    return this;
  }

  mId(messageId) {
    this.messageId = messageId;
    return this;
  }

  naked(nak) {
    this.nak = nak;
  }

  append(p) {
    this.params.push(p);
    return this;
  }

  appendMulti(params) {
    this.params = this.params.concat(params);
  }

  build() {
    const items = [this.sessionId, this.sequence, this.messageId].concat(
      this.params,
    );
    return items.join('~');
  }
}

export class CASClient extends EventEmitter {
  constructor({ host, port }) {
    super();
    this.options = {
      host,
      port,
    };
    this.client = null;
    this.received = null;
  }

  static __XORSUM(message) {
    const sum = Buffer.from([0x0]);
    for (let i = 0; i < message.length; i += 1) {
      sum[0] ^= message[i];
    }
    sum[0] &= 0x7f;
    return sum.toString('hex', 0, 1);
  }

  static __BYTESUM(message) {
    const sum = Buffer.from([0x0]);
    for (let i = 0; i < message.length; i += 1) {
      sum[0] += message.charCodeAt(i);
    }
    sum[0] &= 0x7f;
    return sum.toString('hex', 0, 1);
  }

  __onData(data) {
    if (data instanceof Buffer) {
      this.received = Buffer.concat(this.received, data);
    } else {
      this.received = Buffer.concat(this.received, Buffer.from(data));
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
    }
  }

  connect() {
    const { host, port } = this.options;
    this.client = new net.Socket();
    this.client.connect(port, host);
    this.client.on('data', this.__onData);
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
