import joi from 'joi';

export default {
  send: {
    body: {
      bridgeId: joi.string().required(),
      confId: joi.string().required(),
      messageId: joi.string().required(),
      params: joi.array().items(joi.string()),
    },
  },
};
