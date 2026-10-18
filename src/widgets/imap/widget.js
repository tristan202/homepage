import imapProxyHandler from "./proxy";

const widget = {
  proxyHandler: imapProxyHandler,
  allowedEndpoints: /status/,
};

export default widget;
