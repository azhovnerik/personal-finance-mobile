import type { AuthNextAction, UserResponse } from "./types";

const buildResendRoute = (email?: string | null) =>
  email ? `/auth/resend-verification?email=${encodeURIComponent(email)}` : "/auth/resend-verification";

export const resolveRouteFromUser = (user: UserResponse) => {
  if (user.emailVerified === false) {
    return buildResendRoute(user.email);
  }

  if (user.onboardingCompleted) {
    return "/(tabs)";
  }

  if (user.onboardingStep) {
    return "/onboarding";
  }

  return "/(tabs)";
};

export const resolveRouteFromAuthResult = (payload: {
  nextAction?: AuthNextAction | null;
  user?: UserResponse | null;
}) => {
  if (payload.nextAction === "VERIFY_EMAIL") {
    return buildResendRoute(payload.user?.email);
  }

  if (payload.nextAction === "SET_BASE_CURRENCY" || payload.nextAction === "ONBOARDING") {
    return "/onboarding";
  }

  if (payload.user) {
    return resolveRouteFromUser(payload.user);
  }

  return "/(tabs)";
};

