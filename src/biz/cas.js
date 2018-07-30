/* eslint-disable no-await-in-loop,prefer-destructuring,no-plusplus */
import findKey from 'lodash/findKey';
import { CASClient, Message } from '../client/CASClient';

import config from '../config';
import { ServerError, SubmitNakError } from '../errors';
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
  updatePartitipantTalking,
  upsertParticipant,
} from '../dao/participant';
import { DTMF } from '../entity/DTMF';
import { Vetting } from '../entity/Vetting';
import { removeObsQAModerator, upsertQAModerator } from '../dao/QAModerator';
import { upsertQAFloorParty } from '../dao/QAFloorParty';
import { removeObsQAQueue, upsertQAQueue } from '../dao/QAQueue';
import { upsertQAPartyState } from '../dao/QAPartyState';
import { updateVoteTally, upsertVoteQuestion } from '../dao/vote';
import { upsertFailParticipant } from '../dao/failedParticipant';
import { upsertCustomMessage } from '../dao/customMessage';
import {
  removeLiveConference,
  removeObsLiveConference,
  upsertLiveConference,
} from '../dao/liveConference';
import {
  removeObsOperator,
  removeOperator,
  updateOperatorAttr,
  upsertOperator,
} from '../dao/operator';

let client;
const sessions = {
  0: {
    type: 'LS',
    seq: 0,
    time: {
      upsertServiceListTime: null,
    },
  },
};

/*
 * <pre>
 * {
 *   sessionId: {
 *     type: ['LS', 'BV', 'ACV', 'ACC', 'OV'],
 *     seq: number,
 *
 *     // when LS
 *     time: {
 *       upsertServiceListTime: Date,
 *     }
 *
 *     // when BV
 *     time: {
 *       refreshBridgeListTime: Date,
 *       refreshConferenceList: {bridgeId: Date},
 *       refreshLiveConferenceList: {bridgeId: Date},
 *     },
 *
 *     // when ACV
 *     bridgeId: string,
 *     confId: string,
 *     time: {
 *       participant: Date,
 *       QA: {
 *         moderator: Date,
 *         queue: Date,
 *       }
 *     }
 *
 *     // when ACC
 *     bridgeId: stringOptional,
 *     confId: stringOptional,
 *
 *     // when OV
 *     bridgeId: string,
 *     time: {
 *       operator: Date,
 *     }
 *  }
 * }
 * </pre>
*/

async function upsertServiceList({ sessionId, params }) {
  const { time } = sessions[sessionId];
  if (!time.upsertServiceListTime) {
    time.upsertServiceListTime = new Date();
  }
  const m = params[0];
  const n = params[1];
  const count = parseInt(params[2], 10);
  for (let i = 0; i < count; i += 1) {
    const key = params[3 + i * 3];
    const name = params[3 + i * 3 + 1];
    const version = params[3 + i * 3 + 2];
    await upsert({ key, name, version });
  }
  if (m === n) {
    await removeObs(time.upsertServiceListTime);
    time.upsertServiceListTime = null;
  }
}

async function refreshBridgeList({ sessionId, params }) {
  const { time } = sessions[sessionId];
  if (!time.refreshBridgeListTime) {
    time.refreshBridgeListTime = new Date();
  }
  const m = params[0];
  const n = params[1];
  const count = parseInt(params[2], 10);
  for (let i = 0; i < count; i += 1) {
    const bridgeId = params[3 + i];
    await upsertBridge(bridgeId);
  }
  if (m === n) {
    await removeObsBridge(time.refreshBridgeListTime);
    time.refreshBridgeListTime = null;
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

async function refreshConferenceList({ sessionId, params }) {
  const { time } = sessions[sessionId];
  const bridgeId = params[0];
  if (!time.refreshConferenceList[bridgeId]) {
    time.refreshConferenceList[bridgeId] = new Date();
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
    await removeObsConference({
      bridgeId,
      date: time.refreshConferenceList[bridgeId],
    });
    delete time.refreshConferenceList[bridgeId];
  }
}

async function refreshLiveConferenceList({ sessionId, params }) {
  const { time } = sessions[sessionId];
  const bridgeId = params[0];
  const m = params[1];
  const n = params[2];
  const count = parseInt(params[3], 10);

  if (!time.refreshLiveConferenceList[bridgeId]) {
    time.refreshLiveConferenceList[bridgeId] = new Date();
  }
  let index = 4;
  for (let i = 0; i < count; i += 1) {
    await upsertLiveConference({
      bridgeId,
      confId: params[index++],
      hostCode: params[index++],
      guestCode: params[index++],
      billingCode: params[index++],
      accountNumber: params[index++],
      confActivationTime: params[index++],
      partition: params[index++],
    });
  }
  if (m === n) {
    await removeObsLiveConference({
      bridgeId,
      date: time.refreshLiveConferenceList,
    });
    delete time.refreshLiveConferenceList[bridgeId];
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
    await removeObsParticipant({ bridgeId, confId, date: time.participant });
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
        await removeObsQAModerator({
          bridgeId,
          confId,
          date: time.QA.moderator,
        });
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
        await removeObsQAQueue({ bridgeId, confId, date: time.QA.queue });
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

async function refreshOperator({ sessionId, params }) {
  const { bridgeId, time } = sessions[sessionId];
  const m = params[0];
  const n = params[1];
  const count = parseInt(params[2], 10);

  if (!time.operator) {
    time.operator = new Date();
  }

  let index = 3;
  for (let i = 0; i < count; i += 1) {
    await upsertOperator({
      bridgeId,
      operatorId: params[index++],
      operatorName: params[index++],
    });
  }

  if (m === n) {
    await removeObsOperator({ bridgeId, date: time.operator });
    time.operator = null;
  }
}

async function updateOperatorAttributes({ sessionId, params }) {
  const { bridgeId } = sessions[sessionId];
  const operatorId = params[0];
  const type = params[1];
  switch (type) {
    case '1': {
      let index = 2;
      await updateOperatorAttr({
        bridgeId,
        operatorId,
        type,
        attr: {
          operName: params[index++],
          type: params[index++],
          vestibuleID: params[index++],
          viaPartyID: params[index++],
        },
      });
      break;
    }
    case '2': {
      let index = 2;
      await updateOperatorAttr({
        bridgeId,
        operatorId,
        type,
        attr: {
          connectState: params[index++],
          crntLocID: params[index++],
          crntConfID: params[index++],
        },
      });
      break;
    }
    default:
      logger.error(`unknown subtype of OV.O.A: ${type}`);
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
        bridgeId: params[0],
        confId: params[1],
      });
      break;
    }
    case 'BV .B.LCL':
      await refreshLiveConferenceList(message);
      break;
    case 'BV.B.LC.ADD': {
      const { params } = message;
      await upsertLiveConference({
        bridgeId: params[0],
        confId: params[1],
        hostCode: params[2],
        guestCode: params[3],
        billingCode: params[4],
        accountNumber: params[5],
        confActivationTime: params[6],
        partition: params[7],
      });
      break;
    }
    case 'BV.B.LC.DEL': {
      const { params } = message;
      await removeLiveConference({
        bridgeId: params[0],
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
    case 'ACV.P.TALKER': {
      const { sessionId, params } = message;
      const { bridgeId, confId } = sessions[sessionId];
      const partyId = params[0];
      const talking = params[1];
      await updatePartitipantTalking({ bridgeId, confId, partyId, talking });
      break;
    }
    case 'ACV.BLAST.BLACKLIST': {
      const { sessionId, params } = message;
      const { bridgeId, confId } = sessions[sessionId];
      const count = parseInt(params[0], 10);
      let index = 1;
      for (let i = 0; i < count; i += 1) {
        await upsertFailParticipant({
          bridgeId,
          confId,
          partyId: params[index++],
          blackListedNumber: params[index++],
        });
      }
      break;
    }
    case 'ACV.M': {
      const { sessionId, params } = message;
      const { bridgeId, confId } = sessions[sessionId];
      await upsertCustomMessage({
        bridgeId,
        confId,
        customMessageNumber: params[0],
        status: params[1],
      });
      break;
    }
    case 'OV .OL':
      await refreshOperator(message);
      break;
    case 'OV.O.ADD': {
      const { sessionId, params } = message;
      const { bridgeId } = sessions[sessionId];
      await upsertOperator({
        bridgeId,
        operatorId: params[0],
        operatorName: params[1],
      });
      break;
    }
    case 'OV .O.DEL': {
      const { sessionId, params } = message;
      const { bridgeId } = sessions[sessionId];
      await removeOperator({ bridgeId, operatorId: params[0] });
      break;
    }
    case 'OV.O.A':
      await updateOperatorAttributes(message);
      break;
    default:
      logger.error('unrecognized message: ', message);
      break;
  }
}

function sessionLookup({ serviceType, bridgeId, confId }) {
  return findKey(
    sessions,
    ({ type, bridgeId: savedBridgeId, confId: savedConfId }) => {
      if (type !== serviceType) {
        return false;
      }
      switch (serviceType) {
        case 'ACV':
          return savedBridgeId === bridgeId && savedConfId === confId;
        case 'ACC': {
          const bridgeIdEq =
            bridgeId === savedBridgeId || (!bridgeId && !savedBridgeId);
          const confIdEq = confId === savedConfId || (!confId && !savedConfId);
          return bridgeIdEq && confIdEq;
        }
        default:
          return true;
      }
    },
  );
}

export function startSync() {
  if (client) {
    throw new ServerError('client already exists');
  }
  const { casHost, casPort } = config;
  client = new CASClient({ host: casHost, port: casPort });
  client.on('message', onMessage);
  client.connect();
}

export function createSession({ serviceType, bridgeId, confId, params = [] }) {
  return new Promise((resolve, reject) => {
    // find if session already exists
    const sessionIdFound = sessionLookup({ serviceType, bridgeId, confId });
    if (sessionIdFound) {
      resolve({ sessionId: sessionIdFound });
      return;
    }
    const seqSend = sessions['0'].seq++;
    function onMsg({
      sessionId,
      sequence,
      messageId,
      nak,
      params: respParams,
    }) {
      if (sessionId === '0' && sequence === seqSend && messageId === 'LS.CS') {
        if (nak) {
          reject(new SubmitNakError(respParams));
        } else {
          const newSessionId = respParams[0];
          sessions[newSessionId] = {
            type: serviceType,
            seq: 0,
          };
          if (serviceType === 'BV') {
            sessions[newSessionId].time = {
              refreshBridgeListTime: null,
              refreshConferenceList: {},
              refreshLiveConferenceList: {},
            };
          }

          if (serviceType === 'ACV') {
            sessions[newSessionId].bridgeId = bridgeId;
            sessions[newSessionId].confId = confId;
            sessions[newSessionId].time = {
              participant: null,
              QA: {
                moderator: null,
                queue: null,
              },
            };
          }
          if (serviceType === 'ACC') {
            sessions[newSessionId].bridgeId = bridgeId;
            sessions[newSessionId].confId = confId;
          }
          if (serviceType === 'OV') {
            sessions[newSessionId].bridgeId = bridgeId;
            sessions[newSessionId].time = {
              operator: null,
            };
          }
          resolve({ sessionId: newSessionId });
        }
        client.removeListener('message', onMsg);
      }
    }
    const message = new Message()
      .sId(0)
      .seq(seqSend)
      .mId('LS.CS')
      .append(serviceType);
    if (serviceType === 'ACV') {
      message.append(bridgeId);
      message.append(confId);
    }
    if (serviceType === 'ACC') {
      if (bridgeId) {
        message.append(bridgeId);
      }
      if (confId) {
        message.append(confId);
      }
    }
    if (serviceType === 'OV') {
      message.append(bridgeId);
    }
    message.appendMulti(params);
    client.sendMessage(message);
    client.on('message', onMsg);
  });
}

export function destroySession({ sessionId: sessionIdToDestroy }) {
  return new Promise((resolve, reject) => {
    const seqSend = sessions['0'].seq++;

    function onMsg({ sessionId, sequence, messageId, nak }) {
      if (sessionId === '0' && sequence === seqSend && messageId === 'LS.DS') {
        if (nak) {
          reject();
        } else {
          delete sessions[sessionIdToDestroy];
          resolve();
        }
        client.removeListener('message', onMsg);
      }
    }

    const message = new Message()
      .sId(0)
      .seq(seqSend)
      .mId('LS.DS')
      .append(sessionIdToDestroy);
    client.sendMessage(message);
    client.on('message', onMsg);
  });
}

export function sendMessage({
  sessionId: sessionIdToSend,
  messageId: messageIdToSend,
  params: paramsToSend = [],
}) {
  return new Promise((resolve, reject) => {
    const seqSend = sessions[sessionIdToSend].seq++;
    function onMsg({ sessionId, sequence, messageId, nak, params }) {
      if (
        sessionId === sessionIdToSend &&
        sequence >= seqSend &&
        messageId === messageIdToSend
      ) {
        if (nak) {
          reject();
        } else {
          resolve({ params });
        }
        client.removeListener('message', onMsg);
      }
    }
    const message = new Message()
      .sId(sessionIdToSend)
      .seq(seqSend)
      .mId(messageIdToSend)
      .appendMulti(paramsToSend);
    client.sendMessage(message);
    client.on('message', onMsg);
  });
}

export function stopSync() {
  if (client) {
    client.removeListener('message', onMessage);
    client.close();
    client = null;
  }
}
