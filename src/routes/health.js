/* eslint-disable import/prefer-default-export */
import { Router } from 'express';
import { buildRouteHandler } from '../utils';
import { getStatus } from '../biz/cas2';

export const healthRouter = new Router();

healthRouter.get('/liveness', (req, res) => {
  const liveness = getStatus() !== 'CLOSED';
  if (liveness) {
    buildRouteHandler(() => ({ liveness: true }))(req, res);
  } else {
    res.sendStatus(500);
  }
});
healthRouter.get('/readiness', (req, res) => {
  const readiness = getStatus() === 'CONNECTED';
  if (readiness) {
    buildRouteHandler(() => ({ readiness: true }))(req, res);
  } else {
    res.sendStatus(500);
  }
});
