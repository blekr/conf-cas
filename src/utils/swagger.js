/* eslint-disable import/prefer-default-export,no-underscore-dangle */
import isNumber from 'lodash/isNumber';
import mapValues from 'lodash/mapValues';
import isString from 'lodash/isString';
import keys from 'lodash/keys';
import j2s from 'joi-to-swagger';
import { ServerError } from '../errors';

const requestSchemas = {};

function j2sExtend(definition) {
  const result = j2s(definition).swagger;
  result.required = definition._flags.presence === 'required';
  if (definition._type === 'boolean') {
    result.example = 'true';
  }
  if (definition._type === 'number') {
    if (isNumber(result.minimum)) {
      result.example = result.minimum;
    } else if (isNumber(result.maximum)) {
      result.example = result.maximum;
    } else {
      result.example = 1;
    }
  }

  return result;
}

export function addRequestSchema(name, { params, body, query }) {
  const inPath = keys(params).map(key => ({
    name: key,
    in: 'path',
    ...j2sExtend(params[key]),
  }));
  const inBody = keys(body).map(key => ({
    name: key,
    in: 'body',
    ...j2sExtend(body[key]),
  }));
  const inQuery = keys(query).map(key => ({
    name: key,
    in: 'query',
    ...j2sExtend(query[key]),
  }));
  if (requestSchemas[name]) {
    throw new ServerError(`name ${name} already exists`);
  }
  requestSchemas[name] = [...inPath, ...inBody, ...inQuery];
}

function mapMethod(pathMethod) {
  return {
    ...pathMethod,
    parameters: isString(pathMethod.parameters)
      ? requestSchemas[pathMethod.parameters]
      : pathMethod.parameters,
  };
}

function mapPath(path) {
  return mapValues(path, mapMethod);
}

export function resolveSwaggerDefinition(swaggerDefinition) {
  return {
    ...swaggerDefinition,
    paths: mapValues(swaggerDefinition.paths, mapPath),
  };
}
