/* eslint-disable import/prefer-default-export,no-plusplus,guard-for-in,no-restricted-syntax,no-continue */

import filter from 'lodash/filter';
import logger from '../logger';

export class SessionManager {
  constructor() {
    this.sessions = [
      {
        sessionId: '0',
        seq: 1,
        type: 'LS',
        bridgeId: null,
        confId: null,
        creationSeq: null, // link session seq by which this session is created
        createdAt: new Date(),
        visitedAt: new Date(),
      },
    ];
  }

  // seq: [1, 999]
  seq(sessionId) {
    const session = this.lookupSession({ sessionId });
    const ret = session.seq++;
    if (session.seq >= 1000) {
      session.seq = 1;
    }
    return ret;
  }

  lookupSession({ sessionId, type, bridgeId, confId, creationSeq }) {
    for (const session of this.sessions) {
      if (sessionId !== undefined && session.sessionId !== sessionId) {
        continue;
      }
      if (type !== undefined && session.type !== type) {
        continue;
      }
      if (bridgeId !== undefined && session.bridgeId !== bridgeId) {
        continue;
      }
      if (confId !== undefined && session.confId !== confId) {
        continue;
      }
      if (creationSeq !== undefined && session.creationSeq !== creationSeq) {
        continue;
      }
      session.visitedAt = new Date();
      return session;
    }
    return null;
  }

  // dup check needed before using this method
  createSession({ type, bridgeId, confId, creationSeq }) {
    this.sessions.push({
      sessionId: null,
      seq: 1,
      type,
      bridgeId,
      confId,
      creationSeq,
      createdAt: new Date(),
      visitedAt: new Date(),
    });
  }

  updateSessionId({ type, creationSeq, sessionId }) {
    const session = this.lookupSession({ type, creationSeq });
    if (!session) {
      logger.info(
        `updateSessionId: session not found: ${type}, ${creationSeq}`,
      );
      return false;
    }
    if (session.sessionId) {
      logger.warn(
        `sessionId already exists: ${type}, ${creationSeq}, ${
          session.sessionId
        }`,
      );
    }
    session.sessionId = sessionId;
    return true;
  }

  deleteSession(sessionId) {
    const sizeBefore = this.sessions.length;
    this.sessions = filter(
      this.sessions,
      session => session.sessionId !== sessionId,
    );
    const sizeAfter = this.sessions.length;
    logger.info(`session deleted: ${sizeBefore - sizeAfter}`);
  }
}
