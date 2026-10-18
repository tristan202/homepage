---
title: IMAP
description: IMAP Widget Configuration
---

Shows the number of unread and total messages in a mailbox on any IMAP server (Gmail, Outlook, Fastmail, Dovecot, etc.).

Use `imaps://` for implicit TLS (default port 993) or `imap://` for a plain connection that is upgraded with STARTTLS when the server supports it (default port 143). The mailbox defaults to `INBOX`.

Many providers (e.g. Gmail, Outlook, iCloud) require an app password rather than your regular account password.

Allowed fields: `["unread", "total"]`.

```yaml
widget:
  type: imap
  url: imaps://imap.gmail.com:993
  username: you@example.com
  password: your-app-password
  mailbox: INBOX # optional
```
