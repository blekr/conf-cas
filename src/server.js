/**
 * Copyright © 2016-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/* @flow */
/* eslint-disable no-console, no-shadow */

import app from './app';
import errors from './errors';
import logger from './logger';
import { getEmitter, startOrchestrator } from './biz/orchestrate';
import { startConnection, stopConnection } from './biz/cas2';
import { startNotify, stopNotify } from './biz/casNotify';

const port = process.env.PORT || 8080;
const host = process.env.HOSTNAME || '0.0.0.0';

let server;

async function start() {
  getEmitter().once('leader', async ({ index }) => {
    logger.info('we become the leader');
    startNotify();
    await startConnection({ index });
  });
  getEmitter().once('error', async error => {
    logger.error(`received error from zookeeper: ${error.stack}`);
    await stopConnection();
    stopNotify();
  });
  await startOrchestrator();

  return new Promise(resolve => {
    server = app.listen(port, host, resolve);
  });
}

start()
  .then(() => {
    logger.info(`Node.js API server is listening on http://${host}:${port}/`);
  })
  .catch(err => {
    logger.error(`failed to start: ${err.stack}`);
  });

// Shutdown Node.js app gracefully
function handleExit(options, err) {
  if (options.cleanup) {
    const actions = [server.close];
    actions.forEach((close, i) => {
      try {
        close(() => {
          if (i === actions.length - 1) process.exit();
        });
      } catch (err) {
        if (i === actions.length - 1) process.exit();
      }
    });
  }
  if (err) errors.report(err);
  if (options.exit) process.exit();
}

process.on('exit', handleExit.bind(null, { cleanup: true }));
process.on('SIGINT', handleExit.bind(null, { exit: true }));
process.on('SIGTERM', handleExit.bind(null, { exit: true }));
process.on('uncaughtException', handleExit.bind(null, { exit: true }));
