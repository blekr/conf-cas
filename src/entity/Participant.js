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
    partyId: {
      type: String,
      required: true,
      index: true,
    },
    partyName: {
      type: String,
    },
    talking: {
      type: Boolean,
    },
    attr: {
      1: {
        initialized: Number,
        partyName: String,
        phone: String,
        operatorID: String,
        userDefined: String,
        pIN: String,
        dNIS: String,
        aNI: String,
        billingField: String,
        billingType: Number,
        isModerator: Number,
        hostCtrlLevel: Number,
        multipleDialoutOrder: Number,
      },
      2: {
        location: Number,
        connectState: Number,
        disconnectReason: Number,
        operHelpReq: Number,
        userDefined2: String,
        userDefined3: String,
        userDefined4: String,
        beingVetted: Number,
        bridgeTime: String,
        operatorTime: String,
        conferenceTime: String,
        aGC: Number,
        dataConfID: String,
        operatorConfID: String,
        rosterReconciliationID: String,
        dialedIn: Number,
        reasonForMute: Number,
        inputGain: Number,
        outputGain: Number,
        isAudioClientParty: Number,
        networkHold: Number,
        userDefined5: String,
        userDefined6: String,
        userDefined7: String,
        userDefined8: String,
        userDefined9: String,
        userDefined10: String,
      },
      3: {
        iSDNCauseCode: Number,
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

schema.index({ bridgeId: 1, confId: 1, partyId: 1 }, { unique: true });

export const Participant = mongoose.model('Participant', schema);
