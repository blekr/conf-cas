/**
 * Copyright © 2016-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/* @flow */

/*
 * Helper functions for data loaders (src/Context.js)
 * -------------------------------------------------------------------------- */

import { ClientError, ServerError } from '../errors';
import logger from '../logger';
import { ERROR_CODE } from '../constant';

export function assignType(type: string) {
  return (obj: any) => {
    // eslint-disable-next-line no-underscore-dangle, no-param-reassign
    if (obj) obj.__type = type;
    return obj;
  };
}

export function getType(obj: any) {
  // eslint-disable-next-line no-underscore-dangle
  return obj ? obj.__type : undefined;
}

export function mapTo(
  keys: Array<string | number>,
  keyFn: any => string | number,
) {
  return (rows: Array<any>) => {
    const group = new Map(keys.map(key => [key, null]));
    rows.forEach(row => group.set(keyFn(row), row));
    return Array.from(group.values());
  };
}

export function mapToMany(
  keys: Array<string | number>,
  keyFn: any => string | number,
) {
  return (rows: Array<any>) => {
    const group = new Map(keys.map(key => [key, []]));
    rows.forEach(row => (group.get(keyFn(row)) || []).push(row));
    return Array.from(group.values());
  };
}

export function mapToValues(
  keys: Array<string | number>,
  keyFn: any => string | number,
  valueFn: any => any,
) {
  return (rows: Array<any>) => {
    const group = new Map(keys.map(key => [key, null]));
    rows.forEach(row => group.set(keyFn(row), valueFn(row)));
    return Array.from(group.values());
  };
}

export function getSequenceIndex(path) {
  const found = path.match(/[0-9]+$/);
  if (!found) {
    throw new ServerError(`invalid path: ${path}`);
  }
  return parseInt(found[0], 10);
}

export function str(obj) {
  return JSON.stringify(obj);
}

export function buildRouteHandler(fn) {
  return async (req, res) => {
    try {
      const output = await fn({
        params: req.params,
        query: req.query,
        body: req.body,
      });
      res.json({
        data: output || {},
      });
    } catch (err) {
      if (err instanceof ClientError) {
        logger.warn(`api warning: ${err.stack}`);
        res.json({
          errorCode: err.errorCode,
          errorMessage: err.message,
        });
      } else {
        logger.error(`api error: ${err.stack}`);
        res.json({
          errorCode: ERROR_CODE.UNKNOWN,
          errorMessage: err.message,
        });
      }
    }
  };
}

export function assertTruth({
  value,
  errorCode = ERROR_CODE.UNKNOWN,
  message,
  serverError,
}) {
  if (!value) {
    if (serverError) {
      throw new ServerError(message);
    } else {
      throw new ClientError(errorCode, message);
    }
  }
}

export function delay(milliSeconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliSeconds);
  });
}

export function getJTestExtend() {
  return {
    toBeError(received, errorCode) {
      if (received.errorCode === errorCode) {
        return {
          pass: true,
          message: () =>
            `received errorCode is equal to ${errorCode}: ${received.stack}`,
        };
      }
      return {
        pass: false,
        message: () =>
          `received errorCode ${
            received.errorCode
          } is not equal to ${errorCode}: ${received.stack}`,
      };
    },
  };
}
