/**
 * Copyright © 2016-present Kriasoft.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */

/* @flow */

import map from 'lodash/map';
import validate from 'express-validation';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import yaml from 'js-yaml';
import morgan from 'morgan';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';
import PrettyError from 'pretty-error';
import { healthRouter } from './routes/health';
import { permissionCheck } from './middleware/permissionCheck';
import { resolveSwaggerDefinition } from './utils/swagger';
import { casRouter } from './routes/cas';
import { ERROR_CODE } from './constant';
import logger from './logger';
import {
  injectMetricsRoute,
  requestCounters,
  responseCounters,
  startCollection,
} from './utils/prometheus';

const swaggerDocument = yaml.safeLoad(
  fs.readFileSync('./spec/swagger.yml', 'utf8'),
);
swaggerDocument.info.version = require('../package').version;

const app = express();

injectMetricsRoute(app);
startCollection();
app.use(requestCounters);
app.use(responseCounters);

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(permissionCheck());
app.use('/health', healthRouter);

app.use(
  morgan(
    '[info]: :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"',
  ),
);

app.use('/cas', casRouter);
app.use(
  '/swagger',
  swaggerUi.serve,
  swaggerUi.setup(resolveSwaggerDefinition(swaggerDocument), {
    explorer: true,
    swaggerOptions: {
      showCommonExtensions: true,
    },
  }),
);

const pe = new PrettyError();
pe.skipNodeFiles();
pe.skipPackage('express');

app.use((err, req, res, next) => {
  if (err instanceof validate.ValidationError) {
    const errorMessage = map(
      err.errors,
      ({ field, messages }) => `${field.join(',')}: ${messages.join(',')}`,
    ).join(';');
    res.json({
      errorCode: ERROR_CODE.INVALID_PARAM,
      errorMessage,
    });
    logger.warn(`api warning: ${errorMessage}`);
    return;
  }
  process.stderr.write(pe.render(err));
  next();
});

export default app;
