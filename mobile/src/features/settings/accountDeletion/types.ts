export type AccountDeletionMethod = "PASSWORD" | "APPLE" | "GOOGLE";

export type AccountDeletionRequest = {
  confirmation: string;
  method: AccountDeletionMethod;
  currentPassword?: string;
  googleIdToken?: string;
  appleIdentityToken?: string;
  appleNonce?: string;
  appleAuthorizationCode?: string;
};

export type AppleDeletionCredential = {
  identityToken: string;
  nonce: string;
  authorizationCode: string;
};
