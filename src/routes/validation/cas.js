import joi from 'joi';

export default {
  send: {
    body: {
      bridgeId: joi.string().required(),
      confId: joi.string().required(),
      type: joi
        .string()
        .valid(['ACC', 'ACV'])
        .required(),
      messageId: joi.string().required(),
      params: joi.array().items(joi.string().allow('')),
    },
  },
  activateConference: {
    body: {
      hostPasscode: joi.string().required(),
      guessPasscode: joi.string().required(),
    },
  },
};
