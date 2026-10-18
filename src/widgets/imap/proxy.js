import { ImapFlow } from "imapflow";

import getServiceWidget from "utils/config/service-helpers";
import createLogger from "utils/logger";

const proxyName = "imapProxyHandler";
const logger = createLogger(proxyName);

export default async function imapProxyHandler(req, res) {
  const { group, service, index } = req.query;

  if (!group || !service) {
    logger.debug("Invalid or missing service '%s' or group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  const widget = await getServiceWidget(group, service, index);
  if (!widget) {
    logger.debug("Invalid or missing widget for service '%s' in group '%s'", service, group);
    return res.status(400).json({ error: "Invalid proxy service type" });
  }

  if (!widget.username || !widget.password) {
    return res.status(400).json({ error: "Missing widget username or password" });
  }

  const url = new URL(widget.url);
  // imaps:// uses implicit TLS, imap:// connects in plain text and upgrades with STARTTLS when offered
  const secure = url.protocol !== "imap:";
  const port = url.port ? parseInt(url.port, 10) : secure ? 993 : 143;
  const mailbox = widget.mailbox ?? "INBOX";

  const client = new ImapFlow({
    host: url.hostname,
    port,
    secure,
    auth: { user: widget.username, pass: widget.password },
    logger: false,
  });
  // prevent unhandled socket errors from crashing the process
  client.on("error", (e) => logger.debug(e));

  try {
    await client.connect();
    const status = await client.status(mailbox, { messages: true, unseen: true });

    return res.status(200).send({
      unread: status.unseen ?? 0,
      total: status.messages ?? 0,
    });
  } catch (e) {
    logger.error("Error querying IMAP server %s: %s", url.hostname, e.responseText ?? e.message);
    return res.status(500).send({ error: { message: e.responseText ?? e.message } });
  } finally {
    if (client.usable) {
      await client.logout().catch(() => {});
    } else {
      client.close();
    }
  }
}
