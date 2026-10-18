import { beforeEach, describe, expect, it, vi } from "vitest";

import createMockRes from "test-utils/create-mock-res";

const { ImapFlow, client, getServiceWidget, logger } = vi.hoisted(() => {
  const client = {
    on: vi.fn(),
    connect: vi.fn(),
    status: vi.fn(),
    logout: vi.fn(),
    close: vi.fn(),
    usable: true,
  };
  return {
    client,
    ImapFlow: vi.fn(function ImapFlow() {
      return client;
    }),
    getServiceWidget: vi.fn(),
    logger: { debug: vi.fn(), error: vi.fn() },
  };
});

vi.mock("imapflow", () => ({ ImapFlow }));
vi.mock("utils/config/service-helpers", () => ({ default: getServiceWidget }));
vi.mock("utils/logger", () => ({ default: () => logger }));

import imapProxyHandler from "./proxy";

const req = { query: { group: "g", service: "svc", index: "0" } };

describe("widgets/imap/proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.usable = true;
    client.logout.mockResolvedValue();
  });

  it("returns unread and total counts for INBOX over implicit TLS by default", async () => {
    getServiceWidget.mockResolvedValue({ url: "imaps://mail.example.com", username: "u", password: "p" });
    client.status.mockResolvedValue({ path: "INBOX", messages: 42, unseen: 5 });
    const res = createMockRes();

    await imapProxyHandler(req, res);

    expect(ImapFlow).toHaveBeenCalledWith(
      expect.objectContaining({ host: "mail.example.com", port: 993, secure: true, auth: { user: "u", pass: "p" } }),
    );
    expect(client.status).toHaveBeenCalledWith("INBOX", { messages: true, unseen: true });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ unread: 5, total: 42 });
    expect(client.logout).toHaveBeenCalled();
  });

  it("uses plain imap port and the configured mailbox", async () => {
    getServiceWidget.mockResolvedValue({
      url: "imap://mail.example.com",
      username: "u",
      password: "p",
      mailbox: "Work",
    });
    client.status.mockResolvedValue({ messages: 1, unseen: 0 });
    const res = createMockRes();

    await imapProxyHandler(req, res);

    expect(ImapFlow).toHaveBeenCalledWith(expect.objectContaining({ port: 143, secure: false }));
    expect(client.status).toHaveBeenCalledWith("Work", expect.any(Object));
    expect(res.body).toEqual({ unread: 0, total: 1 });
  });

  it("returns 400 when credentials are missing", async () => {
    getServiceWidget.mockResolvedValue({ url: "imaps://mail.example.com" });
    const res = createMockRes();

    await imapProxyHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(ImapFlow).not.toHaveBeenCalled();
  });

  it("returns 500 and closes the connection when login fails", async () => {
    getServiceWidget.mockResolvedValue({ url: "imaps://mail.example.com:1993", username: "u", password: "bad" });
    client.connect.mockRejectedValue(
      Object.assign(new Error("Command failed"), { responseText: "Invalid credentials" }),
    );
    client.usable = false;
    const res = createMockRes();

    await imapProxyHandler(req, res);

    expect(ImapFlow).toHaveBeenCalledWith(expect.objectContaining({ port: 1993 }));
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: { message: "Invalid credentials" } });
    expect(client.close).toHaveBeenCalled();
  });
});
