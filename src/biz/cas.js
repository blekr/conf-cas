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
  updateConferenceAttr,
  upsertConference,
} from '../dao/conference';
import {
  removeObsParticipant,
  removeParticipant,
  updateParticipantAttr,
  upsertParticipant,
} from '../dao/participant';
import { DTMF } from '../entity/DTMF';
import { Vetting } from '../entity/Vetting';
import { removeObsQAModerator, upsertQAModerator } from '../dao/QAModerator';
import { upsertQAFloorParty } from '../dao/QAFloorParty';
import { removeObsQAQueue, upsertQAQueue } from '../dao/QAQueue';
import { upsertQAPartyState } from '../dao/QAPartyState';
import { updateVoteTally, upsertVoteQuestion } from '../dao/vote';

let client;
let upsertServiceListTime;
let refreshBridgeListTime;
const refreshConferenceListTime = {};
const sessions = {};

/*
 * <pre>
 * {
 *   sessionId: {
 *     type: ['BV', 'ACV'],
 *     seq: number,
 *     bridgeId: string,
 *     confId: string,
 *     time: {
 *       participant: Date,
 *       QA: {
 *         moderator: Date,
 *         queue: Date,
 *       }
 *     }
 *  }
 * }
 * </pre>
*/

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
        unicodeSupportLevel: params[9],
        allowSelectPlayback: params[10],
        mixedUnicodeEnabled: params[11],
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
      groupKey: params[index++],
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

async function updateConferenceAttributes({ sessionId, params }) {
  const bridgeId = sessions[sessionId].bridgeId;
  const confId = sessions[sessionId].confId;
  const type = params[0];
  let index = 1;
  switch (type) {
    case '1':
      await updateConferenceAttr({
        bridgeId,
        confId,
        type,
        attr: {
          confName: params[index++],
          billingCode: params[index++],
          confirmCode: params[index++],
          specInstr: params[index++],
          startTime: params[index++],
          estEndTime: params[index++],
          confType: params[index++],
          ConfInfo: params[index++],
          maxParties: params[index++],
          maxHosts: params[index++],
          pNREnabled: params[index++],
          bOHDEnabled: params[index++],
          autoBreakdownEnabled: params[index++],
          entryExitConfig: params[index++],
          reqFeatures: params[index++],
          dNIS1: params[index++],
          dNIS2: params[index++],
          userFlag1: params[index++],
          userFlag2: params[index++],
          userField1: params[index++],
          userField2: params[index++],
          highProfile: params[index++],
          skipRecordStatusPrompts: params[index++],
          multipleDialoutAttempts: params[index++],
          remainActive: params[index++],
          totalParticipantSittingCount: params[index++],
          sumTotalParticipantSittingCount: params[index++],
          playQAPodiumEnterMessage: params[index++],
          playQAPodiumExitMessage: params[index++],
          configurableFields: params[index++],
          playConferenceAlertResetMsg: params[index++],
          playConferenceAlertDisconnectMsg: params[index++],
          userFlag3: params[index++],
          blockSignalRequest: params[index++],
          allowDuplicatePIN: params[index++],
          minimumDialoutDigits: params[index++],
          maximumDialoutDigits: params[index++],
          musicSource: params[index++],
          validPinRequired: params[index++],
          conferenceHoldWithMusic: params[index++],
          lectureMode: params[index++],
        },
      });
      break;
    case '2':
      await updateConferenceAttr({
        bridgeId,
        confId,
        type,
        attr: {
          state: params[index++],
          secure: params[index++],
          iVRFeatureState: params[index++],
          activeSessionType: params[index++],
          sessionOwnerID: params[index++],
          sessionState: params[index++],
          unAttStarted: params[index++],
          recordEnabled: params[index++],
          recordState: params[index++],
          leaderRecGreet: params[index++],
          quickStart: params[index++],
          pCodeValidCt: params[index++],
          firstCallerMsg: params[index++],
          nextConfQStart: params[index++],
          singleDTMF: params[index++],
          erasureLock: params[index++],
          erasureText: params[index++],
          vettingLevel: params[index++],
          vettingMode: params[index++],
          vettingMsgs: params[index++],
          languageSetting: params[index++],
          ptyCntIn: params[index++],
          ptyCntOut: params[index++],
          allowConfLevelPasscode: params[index++],
          confLevelPasscode: params[index++],
          allowProjectCode: params[index++],
          projectCode: params[index++],
          allowSubConf: params[index++],
          activateSubConf: params[index++],
          confUserDef1: params[index++],
          confUserDef2: params[index++],
          internalRecording: params[index++],
          recordingCode: params[index++],
          callFlow: params[index++],
          operHelpReq: params[index++],
          accountNumber: params[index++],
          hostAudioMode: params[index++],
          guestAudioMode: params[index++],
          vPNPrefix: params[index++],
          mainConfID: params[index++],
          subConfNumber: params[index++],
          allowHostMuteOverride: params[index++],
          allowGuestMuteOverride: params[index++],
          duration: params[index++],
          vPNPrefixRequired: params[index++],
          vPNDelimiter: params[index++],
          forcePromptCASDialouts: params[index++],
          allowIncreasePartyLimit: params[index++],
          passcodeDTMFPattern: params[index++],
          preferredCodec: params[index++],
          callingNumber: params[index++],
          cASMultiSummitDialoutRules: params[index++],
          lRGConfParticipants: params[index++],
          lRGCustomMsgPrimary: params[index++],
          lRGCustomMsgSecondary: params[index++],
        },
      });
      break;
    case '3':
      await updateConferenceAttr({
        bridgeId,
        confId,
        type,
        attr: {
          userLabel1: params[index++],
          userLabel2: params[index++],
          userLabel3: params[index++],
          userLabel4: params[index++],
        },
      });
      break;
    case '4':
      await updateConferenceAttr({
        bridgeId,
        confId,
        type,
        attr: {
          customerReference: params[index++],
          serviceCode1: params[index++],
          serviceCode2: params[index++],
          serviceCode3: params[index++],
          serviceCode4: params[index++],
          serviceCode5: params[index++],
          muteState: params[index++],
        },
      });
      break;
    case '5':
      await updateConferenceAttr({
        bridgeId,
        confId,
        type,
        attr: {
          hybridSDKToken: params[index++],
          adhocInstall: params[index++],
          hybridClientURL: params[index++],
          hybridConnectData: params[index++],
          appDetection: params[index++],
          cSPBranding: params[index++],
          cSPHelpTip: params[index++],
          clientHashList: params[index++],
        },
      });
      break;
    default:
      logger.error(`unknown type of conference attributes: ${type}`);
  }
}

async function refreshParticipantList({ sessionId, params }) {
  const { bridgeId, confId, time } = sessions[sessionId];

  if (!time.participant) {
    time.participant = new Date();
  }

  const m = params[0];
  const n = params[1];

  const count = parseInt(params[2], 10);
  let index = 3;
  for (let i = 0; i < count; i += 1) {
    await upsertParticipant({
      bridgeId,
      confId,
      partyId: params[index++],
      partyName: params[index++],
    });
  }

  if (m === n) {
    await removeObsParticipant(time.participant);
    time.participant = null;
  }
}

async function updateParticipantAttributes({ sessionId, params }) {
  const bridgeId = sessions[sessionId].bridgeId;
  const confId = sessions[sessionId].confId;

  const partyId = params[0];
  const type = params[1];
  let index = 2;
  switch (type) {
    case '1':
      await updateParticipantAttr({
        bridgeId,
        confId,
        partyId,
        type,
        attr: {
          initialized: params[index++],
          partyName: params[index++],
          phone: params[index++],
          operatorID: params[index++],
          userDefined: params[index++],
          pIN: params[index++],
          dNIS: params[index++],
          aNI: params[index++],
          billingField: params[index++],
          billingType: params[index++],
          isModerator: params[index++],
          hostCtrlLevel: params[index++],
          multipleDialoutOrder: params[index++],
        },
      });
      break;
    case '2':
      await updateParticipantAttr({
        bridgeId,
        confId,
        partyId,
        type,
        attr: {
          location: params[index++],
          connectState: params[index++],
          disconnectReason: params[index++],
          operHelpReq: params[index++],
          userDefined2: params[index++],
          userDefined3: params[index++],
          userDefined4: params[index++],
          beingVetted: params[index++],
          bridgeTime: params[index++],
          operatorTime: params[index++],
          conferenceTime: params[index++],
          aGC: params[index++],
          dataConfID: params[index++],
          operatorConfID: params[index++],
          rosterReconciliationID: params[index++],
          dialedIn: params[index++],
          reasonForMute: params[index++],
          inputGain: params[index++],
          outputGain: params[index++],
          isAudioClientParty: params[index++],
          networkHold: params[index++],
          userDefined5: params[index++],
          userDefined6: params[index++],
          userDefined7: params[index++],
          userDefined8: params[index++],
          userDefined9: params[index++],
          userDefined10: params[index++],
        },
      });
      break;
    case '3':
      await updateParticipantAttr({
        bridgeId,
        confId,
        partyId,
        type,
        attr: {
          iSDNCauseCode: params[index++],
        },
      });
      break;
    default:
      logger.error(`unknown type of participant attributes type: ${type}`);
      break;
  }
}

async function refreshQA({ sessionId, params }) {
  const { bridgeId, confId, time } = sessions[sessionId];
  const type = params[0];
  switch (type) {
    case '1': {
      const m = params[1];
      const n = params[2];
      const count = parseInt(params[3], 10);

      if (!time.QA.moderator) {
        time.QA.moderator = new Date();
      }
      let index = 4;
      for (let i = 0; i < count; i += 1) {
        await upsertQAModerator({ bridgeId, confId, partyId: params[index++] });
      }
      if (m === n) {
        await removeObsQAModerator(time.QA.moderator);
        time.QA.moderator = null;
      }
      break;
    }
    case '2': {
      const m = params[1];
      const n = params[2];
      const floorPartyID = params[3];
      const count = parseInt(params[4], 10);

      await upsertQAFloorParty({ bridgeId, confId, partyId: floorPartyID });

      if (!time.QA.queue) {
        time.QA.queue = new Date();
      }
      let index = 4;
      for (let i = 0; i < count; i += 1) {
        await upsertQAQueue({ bridgeId, confId, partyId: params[index++] });
      }

      if (m === n) {
        await removeObsQAQueue(time.QA.queue);
        time.QA.queue = null;
      }
      break;
    }
    case '3': {
      const partyId = params[1];
      const state = params[2];
      const position = params[3];
      await upsertQAPartyState({ bridgeId, confId, partyId, state, position });
      break;
    }
    default:
      logger.error(`unknown subtype for ACV.Q.A: ${type}`);
      break;
  }
}

async function upsertVote({ sessionId, params }) {
  const { bridgeId, confId } = sessions[sessionId];
  const type = params[0];
  let index = 1;
  switch (type) {
    case '1':
      await upsertVoteQuestion({
        bridgeId,
        confId,
        question: params[index++],
        choices: [
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
        ],
      });
      break;
    case '2':
      await updateVoteTally({
        bridgeId,
        confId,
        tallyCompleted: params[index++],
        ooVotes: params[index++],
        votes: [
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
          params[index++],
        ],
      });
      break;
    default:
      logger.error(`unknown subtype of ACV.V.A: ${type}`);
      break;
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
        groupKey: params[4],
        mainConfID: params[5],
        subConfNumber: params[6],
        partition: params[7],
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

    // Active Conference: conference’s attributes
    case 'ACV.A': {
      await updateConferenceAttributes(message);
      break;
    }

    // Active Conference: participants
    case 'ACV.PL':
      await refreshParticipantList(message);
      break;
    case 'ACV.P.ADD': {
      const bridgeId = sessions[message.sessionId].bridgeId;
      const confId = sessions[message.sessionId].confId;
      const partyId = message.params[0];
      const partyName = message.params[1];
      await upsertParticipant({ bridgeId, confId, partyId, partyName });
      break;
    }
    case 'ACV.P.DEL': {
      const bridgeId = sessions[message.sessionId].bridgeId;
      const confId = sessions[message.sessionId].confId;
      const partyId = message.params[0];
      await removeParticipant({ bridgeId, confId, partyId });
      break;
    }
    case 'ACV.P.A':
      await updateParticipantAttributes(message);
      break;
    case 'ACV.P.DTMF': {
      const { sessionId, params } = message;
      const bridgeId = sessions[sessionId].bridgeId;
      const confId = sessions[sessionId].confId;
      let index = 0;
      await new DTMF({
        bridgeId,
        confId,
        partyId: params[index++],
        DTMF: params[index++],
        summitPortID: params[index++],
        partyName: params[index++],
        partyPhone: params[index++],
        partyPcode: params[index++],
        confHostPcode: params[index++],
        confGuestPcode: params[index++],
        confBillCode: params[index++],
      }).save();
      break;
    }
    case 'ACV.P.VET.ALERT': {
      const { sessionId, params } = message;
      const bridgeId = sessions[sessionId].bridgeId;
      const confId = sessions[sessionId].confId;
      await new Vetting({
        bridgeId,
        confId,
        partyId: params[0],
      }).save();
      break;
    }
    case 'ACV.Q.A':
      await refreshQA(message);
      break;
    case 'ACV.V.A':
      await upsertVote(sessions);
      break;
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
