export type ActionName = 'reminder.create' | 'content.lookup' | 'feedback.submit' | 'human_follow_up.request' | 'appointment.request';

export type ActionProposal = {
  name: ActionName;
  arguments: Record<string, unknown>;
  expiresAt: string;
};

export interface ActionExecutor {
  execute(proposal: ActionProposal, idempotencyKey: string): Promise<{ status: 'executed'; result: Record<string, unknown> }>;
}
