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
];

export function findTicketById(ticketId: string) {
  return mockTickets.find((ticket) => ticket.ticket_id === ticketId);
}