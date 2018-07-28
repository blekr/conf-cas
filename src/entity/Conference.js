/* eslint-disable import/prefer-default-export */
import mongoose from 'mongoose';

const { Schema } = mongoose;

const schema = new Schema(
  {
    bridgeId: {
      type: String,
      required: true,
      index: true,
    },
    confId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      index: true,
    },
    key: {
      type: String,
      index: true,
      required: true,
      unique: true,
    },
    groupKey: {
      type: String,
    },
    mainConfID: {
      type: String,
      index: true,
    },
    subConfNumber: {
      type: Number,
    },
    partition: {
      type: Number,
    },

    attr: {
      1: {
        confName: String,
        billingCode: String,
        confirmCode: String,
        specInstr: String,
        startTime: String,
        estEndTime: String,
        confType: Number,
        ConfInfo: Number,
        maxParties: Number,
        maxHosts: Number,
        pNREnabled: Number,
        bOHDEnabled: Number,
        autoBreakdownEnabled: Number,
        entryExitConfig: String,
        reqFeatures: String,
        dNIS1: String,
        dNIS2: String,
        userFlag1: Number,
        userFlag2: Number,
        userField1: String,
        userField2: String,
        highProfile: Number,
        skipRecordStatusPrompts: Number,
        multipleDialoutAttempts: Number,
        remainActive: Number,
        totalParticipantSittingCount: Number,
        sumTotalParticipantSittingCount: Number,
        playQAPodiumEnterMessage: Number,
        playQAPodiumExitMessage: Number,
        configurableFields: String,
        playConferenceAlertResetMsg: Number,
        playConferenceAlertDisconnectMsg: Number,
        userFlag3: Number,
        blockSignalRequest: Number,
        allowDuplicatePIN: Number,
        minimumDialoutDigits: Number,
        maximumDialoutDigits: Number,
        musicSource: Number,
        validPinRequired: Number,
        conferenceHoldWithMusic: Number,
        lectureMode: Number,
      },
      2: {
        state: Number,
        secure: Number,
        iVRFeatureState: Number,
        activeSessionType: Number,
        sessionOwnerID: String,
        sessionState: Number,
        unAttStarted: Number,
        recordEnabled: Number,
        recordState: Number,
        leaderRecGreet: Number,
        quickStart: Number,
        pCodeValidCt: Number,
        firstCallerMsg: Number,
        nextConfQStart: Number,
        singleDTMF: Number,
        erasureLock: Number,
        erasureText: Number,
        vettingLevel: String,
        vettingMode: Number,
        vettingMsgs: Number,
        languageSetting: Number,
        ptyCntIn: Number,
        ptyCntOut: Number,
        allowConfLevelPasscode: Number,
        confLevelPasscode: String,
        allowProjectCode: Number,
        projectCode: String,
        allowSubConf: Number,
        activateSubConf: Number,
        confUserDef1: String,
        confUserDef2: String,
        internalRecording: Number,
        recordingCode: String,
        callFlow: Number,
        operHelpReq: Number,
        accountNumber: String,
        hostAudioMode: String,
        guestAudioMode: String,
        vPNPrefix: String,
        mainConfID: String,
        subConfNumber: String,
        allowHostMuteOverride: Number,
        allowGuestMuteOverride: Number,
        duration: Number,
        vPNPrefixRequired: Number,
        vPNDelimiter: String,
        forcePromptCASDialouts: Number,
        allowIncreasePartyLimit: Number,
        passcodeDTMFPattern: Number,
        preferredCodec: Number,
        callingNumber: String,
        cASMultiSummitDialoutRules: Number,
        lRGConfParticipants: Number,
        lRGCustomMsgPrimary: Number,
        lRGCustomMsgSecondary: Number,
      },
      3: {
        userLabel1: String,
        userLabel2: String,
        userLabel3: String,
        userLabel4: String,
      },
      4: {
        customerReference: String,
        serviceCode1: String,
        serviceCode2: String,
        serviceCode3: String,
        serviceCode4: String,
        serviceCode5: String,
        muteState: Number,
      },
      5: {
        hybridSDKToken: String,
        adhocInstall: Number,
        hybridClientURL: String,
        hybridConnectData: String,
        appDetection: String,
        cSPBranding: String,
        cSPHelpTip: String,
        clientHashList: String,
      },
    },

    deleted: {
      type: Boolean,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

schema.index({ bridgeId: 1, confId: 1 }, { unique: true });

export const Conference = mongoose.model('Conference', schema);