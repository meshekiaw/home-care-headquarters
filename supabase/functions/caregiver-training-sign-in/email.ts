export interface TrainingEmailDependencies {
  confirmed: (userId: string, email: string) => Promise<boolean>;
  magicLink: (email: string) => Promise<void>;
  confirmationLink: (email: string) => Promise<void>;
}

// New accounts remain unconfirmed until the recipient follows the email link.
export async function sendTrainingEmail(email: string, userId: string, deps: TrainingEmailDependencies): Promise<void> {
  if (await deps.confirmed(userId, email)) {
    await deps.magicLink(email);
  } else {
    await deps.confirmationLink(email);
  }
}