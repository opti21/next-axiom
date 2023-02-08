import { throttle } from './shared';
import config, { isVercel, Version } from './config';
import {onLCP, onFID, onCLS, onINP, onFCP, onTTFB, Metric } from 'web-vitals';

const url = config.getWebVitalsEndpoint();

export declare type WebVitalsMetric = Metric |  & { route: string };

const throttledSendMetrics = throttle(sendMetrics, 1000);
let collectedMetrics: WebVitalsMetric[] = [];

function reportWebVital(metric: Metric ) {
  collectedMetrics.push({ route: window.__NEXT_DATA__?.page, ...metric });
  // if Axiom env vars are not set, do nothing,
  // otherwise devs will get errors on dev environments
  if (!config.isEnvVarsSet()) {
    return;
  }
  throttledSendMetrics();
}

export function reportWebVitals() {
  if (typeof window === 'undefined') {
    return
  }

  onCLS(reportWebVital)
  onFID(reportWebVital)
  onLCP(reportWebVital)
  onINP(reportWebVital)
  onFCP(reportWebVital)
  onTTFB(reportWebVital)
}

function sendMetrics() {
  const body = JSON.stringify(config.wrapWebVitalsObject(collectedMetrics));
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'next-axiom/v' + Version,
  };
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  }
  const reqOptions: RequestInit = { body, method: 'POST', keepalive: true, headers };

  function sendFallback() {
    // Do not leak network errors; does not affect the running app
    fetch(url, reqOptions).catch(console.error);
  }

  if (config.isBrowser && isVercel && navigator.sendBeacon) {
    try {
      // See https://github.com/vercel/next.js/pull/26601
      // Navigator has to be bound to ensure it does not error in some browsers
      // https://xgwang.me/posts/you-may-not-know-beacon/#it-may-throw-error%2C-be-sure-to-catch
      navigator.sendBeacon.bind(navigator)(url, body);
    } catch (err) {
      sendFallback();
    }
  } else {
    sendFallback();
  }

  collectedMetrics = [];
}
