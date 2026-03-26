export type TicketRecord = {
  ticket_id: string;
  ticket_url: string;
  commit_message: string;
  files_changed: string[];
  code_diff: string;
};

export const mockTickets: TicketRecord[] = [
  {
    ticket_id: "OTHK-221",
    ticket_url: "https://jira.example.com/OTHK-221",
    commit_message: "Fix: login issue due to session bug",
    files_changed: ["app/code/Session.php", "app/etc/env.php"],
    code_diff: `- if (!$session->isValid()) { return false; }
- $token = $_COOKIE['session_token'];
- if (!$token) { throw new Exception('Missing token'); }
+ $token = $_COOKIE['session_token'] ?? '';
+ if ($token === '') { return false; }
+ $session->refreshFromStore($token);
+ if (!$session->isValid()) { return false; }
+ $session->rotateId();
+ return true;`,
  },
  {
    ticket_id: "PAY-902",
    ticket_url: "https://jira.example.com/PAY-902",
    commit_message: "Fix: duplicate payment retry on timeout",
    files_changed: ["services/payment.ts", "api/checkout.ts", "db/schema.sql"],
    code_diff: `- await gateway.charge(orderId, amount);
- await savePayment(orderId, amount, 'success');
+ const existing = await findPaymentByIdempotencyKey(idempotencyKey);
+ if (existing) { return existing; }
+ const result = await gateway.charge(orderId, amount, idempotencyKey);
+ await savePayment(orderId, amount, result.status, idempotencyKey);
+ await updateOrderState(orderId, result.status);
@@
+ ALTER TABLE payments ADD COLUMN idempotency_key VARCHAR(64) UNIQUE;`,
  },
  {
    ticket_id: "CFG-114",
    ticket_url: "https://jira.example.com/CFG-114",
    commit_message: "Feature: support per-environment email sender",
    files_changed: ["config/mailer.ts", "config/default.json", "config/prod.json"],
    code_diff: `- export const sender = 'noreply@company.com';
+ export const sender = process.env.MAIL_SENDER ?? config.mail.sender;
@@
- "mail": { "sender": "noreply@company.com" }
+ "mail": { "sender": "sandbox@company.com" }
@@
+ "mail": { "sender": "support@company.com" }`,
  },
  {
    ticket_id: "REAL-103",
    ticket_url: "https://jira.example.com/REAL-103",
    commit_message: "Fix: prevent profile page crash on null avatar",
    files_changed: ["src/ui/profile.tsx", "src/lib/avatar.ts"],
    code_diff: `- const avatar = user.avatar.url;
- return <img src={avatar} alt={user.name} />;
+ const avatar = user.avatar?.url ?? '/images/avatar-default.png';
+ return <img src={avatar} alt={user.name} loading='lazy' />;
@@
- export function normalizeAvatar(url: string) { return url.trim(); }
+ export function normalizeAvatar(url?: string) {
+   return (url ?? '').trim() || '/images/avatar-default.png';
+ }`,
  },
  {
    ticket_id: "REAL-104",
    ticket_url: "https://jira.example.com/REAL-104",
    commit_message: "Feature: add retry guard for webhook processor",
    files_changed: ["src/services/webhook.ts", "src/config/retry.ts"],
    code_diff: `- await processWebhook(event);
+ const maxAttempts = retryConfig.webhookMaxAttempts ?? 3;
+ if (event.attempt > maxAttempts) {
+   return { skipped: true, reason: 'attempt-limit-reached' };
+ }
+ await processWebhook(event);
@@
- export const retryConfig = {};
+ export const retryConfig = { webhookMaxAttempts: 3 };`,
  },
];

export function findTicketById(ticketId: string) {
  return mockTickets.find((ticket) => ticket.ticket_id === ticketId);
}