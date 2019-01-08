import winston from 'winston';
import isEmpty from 'lodash/isEmpty';
import { increaseErrors } from './utils/prometheus';

const transports = [
  new winston.transports.Console({
    formatter: ({ message, meta, level }) => {
      const metaString = isEmpty(meta)
        ? ''
        : `\n\t${JSON.stringify(meta, null, 2)}`;
      const str = `[${level}]: ${message}${metaString}`;
      return str;
    },
  }),
];

const logger = new winston.Logger({
  level: 'info',
  transports,
});

export default {
  info: logger.info,
  warn: logger.warn,
  error: (...args) => {
    increaseErrors();
    logger.error(...args);
  },
};
