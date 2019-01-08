import { register, Counter, Summary, collectDefaultMetrics } from 'prom-client';
import ResponseTime from 'response-time';

const pNameSpace = 'phick_service_';
const numOfRequests = new Counter({
  name: `${pNameSpace}num_of_requests`,
  help: 'Number of requests made',
  labelNames: ['method', 'path'],
});
const numOfErrors = new Counter({
  name: `${pNameSpace}num_of_errors`,
  help: 'Number of errors made',
});
const numOfCas = new Counter({
  name: `${pNameSpace}num_of_cas`,
  help: 'Number of cas made',
  labelNames: ['direction'],
});

const responses = new Summary({
  name: `${pNameSpace}responses`,
  help: 'Response time in millis',
  labelNames: ['method', 'path'],
  maxAgeSeconds: 300,
  ageBuckets: 5,
});

export function startCollection() {
  collectDefaultMetrics({ prefix: pNameSpace });
}

export function requestCounters(req, res, next) {
  if (req.path !== '/metrics') {
    numOfRequests.inc({
      method: req.method,
      path: req.originalUrl.replace(/\?.*/, ''),
    });
  }
  next();
}

export const responseCounters = ResponseTime((req, res, time) => {
  if (req.url !== '/metrics') {
    responses
      .labels(req.method, req.originalUrl.replace(/\?.*/, ''))
      .observe(time);
  }
});

export function increaseErrors() {
  numOfErrors.inc();
}

export function increaseCasOut() {
  numOfCas.inc({
    direction: 'out',
  });
}

export function increaseCasIn() {
  numOfCas.inc({
    direction: 'in',
  });
}

export function injectMetricsRoute(app) {
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(register.metrics());
  });
}
