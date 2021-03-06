/* eslint-disable import/prefer-default-export */
import validate from 'express-validation';
import { Router } from 'express';
import { buildRouteHandler } from '../utils';
import {
  activateConference,
  dumpSession,
  refreshConferenceAttributes,
  refreshConferenceList,
  sendMessage,
} from '../biz/cas2';
import validation from './validation/cas';
import { addRequestSchema } from '../utils/swagger';

export const casRouter = new Router();

addRequestSchema('sendToCas', validation.send);
casRouter.post(
  '/send',
  validate(validation.send),
  buildRouteHandler(({ body }) => sendMessage(body)),
);

casRouter.get('/sessions', buildRouteHandler(() => dumpSession()));

addRequestSchema('activateConference', validation.activateConference);
casRouter.post(
  '/activateConference',
  validate(validation.activateConference),
  buildRouteHandler(({ body }) => activateConference(body)),
);

casRouter.post(
  '/refreshConferenceList',
  buildRouteHandler(() => refreshConferenceList()),
);

casRouter.post(
  '/refreshConferenceAttributes',
  buildRouteHandler(() => refreshConferenceAttributes()),
);
