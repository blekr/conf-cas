/* eslint-disable import/prefer-default-export */
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
    return this;
  }

  append(p) {
    this.params.push(p);
    return this;
  }

  appendMulti(params) {
    this.params = this.params.concat(params);
    return this;
  }

  build() {
    const items = [this.sessionId, this.sequence, this.messageId].concat(
      this.params,
    );
    return items.join('~');
  }

  toString() {
    return `${this.sessionId}:${this.sequence}:${this.messageId}`;
  }
}
