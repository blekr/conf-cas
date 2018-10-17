import zookeeper from 'node-zookeeper-client';
import EventEmitter from 'events';
import map from 'lodash/map';
import min from 'lodash/min';
import isEmpty from 'lodash/isEmpty';
import config from '../config';
import { ZookeeperClient } from '../client/ZookeeperClient';
import { getSequenceIndex } from '../utils';
import logger from '../logger';

const emitter = new EventEmitter();
let client;
let myIndex;

function onChildren(children) {
  logger.info(`on new children: ${children}`);
  if (isEmpty(children)) {
    return;
  }
  const indexes = map(children, getSequenceIndex);
  const minIndex = min(indexes);
  if (minIndex === myIndex) {
    emitter.emit('leader', { index: myIndex });
  }
}

function onError(error) {
  emitter.emit('error', error);
}

export function getEmitter() {
  return emitter;
}

export async function startOrchestrator() {
  const { zookeeper: { host, port, root } } = config;
  client = new ZookeeperClient({ host, port });
  await client.connect();
  await client.makeDir(`${root}/clients`);

  const createdPath = await client.createNode({
    path: `${root}/clients/client`,
    mode: zookeeper.CreateMode.EPHEMERAL_SEQUENTIAL,
  });
  myIndex = getSequenceIndex(createdPath);

  client.listenChildren({ path: `${root}/clients`, onChildren, onError });
}

export async function stopOrchestrator() {
  if (client) {
    client.close();
    client = null;
  }
}
