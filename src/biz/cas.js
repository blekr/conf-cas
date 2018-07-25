/* eslint-disable no-await-in-loop,prefer-destructuring,no-plusplus */
import { CASClient, Message } from '../client/CASClient';

import config from '../config';
import { ServerError } from '../errors';
import logger from '../logger';
import { BridgeInfo } from '../entity/BridgeInfo';
import { removeObs, upsert } from '../dao/serviceList';
import {
  upsertBridge,
  removeObsBridge,
  removeBridgeById,
  updateBridge,
} from '../dao/bridge';
import {
  removeConference,
  removeObsConference,
  upsertConference,
} from '../dao/conference';

let client;
let upsertServiceListTime;
let refreshBridgeListTime;
const refreshConferenceListTime = {};

async function upsertServiceList(message) {
  if (!upsertServiceListTime) {
    upsertServiceListTime = new Date();
  }
  const m = message.params[0];
  const n = message.params[1];
  const count = parseInt(message.params[2], 10);
  for (let i = 0; i < count; i += 1) {
    const key = message.params[3 + i * 3];
    const name = message.params[3 + i * 3 + 1];
    const version = message.params[3 + i * 3 + 2];
    await upsert({ key, name, version });
  }
  if (m === n) {
    await removeObs(upsertServiceListTime);
    upsertServiceListTime = null;
  }
}

async function refreshBridgeList(message) {
  if (!refreshBridgeListTime) {
    refreshBridgeListTime = new Date();
  }
  const m = message.params[0];
  const n = message.params[1];
  const count = parseInt(message.params[2], 10);
  for (let i = 0; i < count; i += 1) {
    const bridgeId = message.params[3 + i];
    await upsertBridge(bridgeId);
  }
  if (m === n) {
    await removeObsBridge(refreshBridgeListTime);
    refreshBridgeListTime = null;
  }
}

async function updateBridgeAttr({ params }) {
  const bridgeId = params[0];
  const type = params[1];
  if (type === '1') {
    await updateBridge({
      bridgeId,
      attrs: {
        state: params[2],
        name: params[3],
        type: params[4],
        unicodeSupportLevel: params[5],
        allowSelectPlayback: params[6],
        mixedUnicodeEnabled: params[7],
      },
    });
  } else if (type === '2') {
    let index = 3;
    const partitionCount = parseInt(params[2], 10);
    const partitions = [];
    for (let i = 0; i < partitionCount; i += 1) {
      partitions.push({
        partitionIndex: params[index++],
        partitionLabel: params[index++],
        isEnabled: params[index++],
        isDefault: params[index++],
        maxPorts: params[index++],
        dialGroup: params[index++],
        dialGroupType: params[index++],
      });
    }
    await updateBridge({ bridgeId }, { partitions });
  } else {
    logger.error(`unknown type for BV.B.A: ${type}`);
  }
}

async function refreshConferenceList({ params }) {
  const bridgeId = params[0];
  if (!refreshConferenceListTime[bridgeId]) {
    refreshConferenceListTime[bridgeId] = new Date();
  }
  const m = params[1];
  const n = params[2];
  const count = parseInt(params[3], 10);

  let index = 4;
  for (let i = 0; i < count; i += 1) {
    await upsertConference({
      bridgeId,
      confId: params[index++],
      name: params[index++],
      key: params[index++],
      mainConfID: params[index++],
      subConfNumber: params[index++],
      partition: params[index++],
    });
  }

  if (m === n) {
    await removeObsConference(refreshConferenceListTime[bridgeId]);
    delete refreshConferenceListTime[bridgeId];
  }
}

async function onMessage(message) {
  logger.info('got message: ', message);
  if (message.nak) {
    logger.error('got message of nak: ', message);
    return;
  }
  switch (message.messageId) {
    case 'LS.VER':
      await BridgeInfo.updateOne(
        { key: 'version' },
        { $set: { value: message.params[0] } },
      ).exec();
      break;
    case 'LS.SL':
      await upsertServiceList(message);
      break;
    case 'LS.CS': {
      // bvSession = message.params[1];
      // sessionId is captured by sender(sender will listen for the desired event)
      break;
    }
    case 'BV.BL': {
      await refreshBridgeList(message);
      break;
    }
    case 'BV.B.ADD': {
      await upsertBridge(message.params[0]);
      break;
    }
    case 'BV .B.DEL': {
      await removeBridgeById(message.params[0]);
      break;
    }
    case 'BV.B.A': {
      await updateBridgeAttr(message);
      break;
    }
    case 'BV.B.ACL': {
      await refreshConferenceList(message);
      break;
    }
    case 'BV.B.AC.MOD':
    case 'BV.B.AC.ADD': {
      const { params } = message;
      await upsertConference({
        bridgeId: params[0],
        confId: params[1],
        name: params[2],
        key: params[3],
        mainConfID: params[4],
        subConfNumber: params[5],
        partition: params[6],
      });
      break;
    }
    case 'BV.B.AC.DEL': {
      const { params } = message;
      await removeConference({
        bridgeID: params[0],
        confId: params[1],
      });
      break;
    }
    default:
      logger.error('unrecognized message: ', message);
      break;
  }
}

export function startSync() {
  if (client) {
    throw new ServerError('client already exists');
  }
  const { casHost, casPort } = config;
  client = new CASClient({ host: casHost, port: casPort });
  client.on('message', onMessage);
  client.connect();

  // create bridge view session
  const csMessage = new Message()
    .sId(0)
    .seq(0)
    .mId('LS.CS')
    .append('BV');
  client.sendMessage(csMessage);
}

export function stopSync() {
  if (client) {
    client.removeListener('message', onMessage);
    client.close();
    client = null;
  }
}
