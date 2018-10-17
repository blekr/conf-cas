/* eslint-disable import/prefer-default-export */
import config from '../config';
import logger from '../logger';
import { ERROR_CODE } from '../constant';

export function permissionCheck() {
  return async (req, res, next) => {
    const internalKey = req.header('internal-key');
    if (!internalKey) {
      res.json({
        data: {
          errorCode: ERROR_CODE.FORBIDDEN,
          errorMessage: '',
        },
      });
      logger.info(
        `req ${req.originalUrl} is blocked due to missing internal key`,
      );
      return;
    }
    if (internalKey === config.internalKey) {
      next();
    } else {
      res.json({
        data: {
          errorCode: ERROR_CODE.FORBIDDEN,
          errorMessage: '',
        },
      });
      logger.info(
        `req ${req.originalUrl} is blocked due to invalid internal key`,
      );
    }
  };
}
