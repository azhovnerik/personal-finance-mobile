import type {OnboardingStateResponse, OnboardingStep, SaveOnboardingStepPayload} from "../../src/features/auth/types";
import {ApiError, completeOnboarding, getOnboardingState, saveOnboardingStep} from "../../src/features/auth/api";

export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const hasStepActuallyAdvanced = (step: OnboardingStep, onboardingState: OnboardingStateResponse) => {
    if (step === "FIRST_EXPENSES") {
        return onboardingState.currentStep !== step || onboardingState.completed;
    }
    return onboardingState.currentStep !== step;
};
export const hasFirstExpensesActuallyCompleted = (onboardingState: OnboardingStateResponse | null | undefined) => {
    if (!onboardingState) {
        return false;
    }

    return onboardingState.completed
        || onboardingState.currentStep === null
        || onboardingState.completedSteps.includes("FIRST_EXPENSES");
};

export const waitForStepAdvance = async (
    step: OnboardingStep,
    options?: { timeoutMs?: number; intervalMs?: number },
) => {
    const timeoutMs = options?.timeoutMs ?? 12000;
    const intervalMs = options?.intervalMs ?? 700;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const refreshedState = await getOnboardingState();
        if (hasStepActuallyAdvanced(step, refreshedState)) {
            return refreshedState;
        }

        await delay(intervalMs);
    }

    return null;
};

export const saveStepWithObservedProgress = async (
    step: OnboardingStep,
    payload: SaveOnboardingStepPayload,
) => {
    const saveAttempt = saveOnboardingStep(payload)
        .then((nextState) => ({kind: "save_success" as const, state: nextState}))
        .catch((error) => ({kind: "save_error" as const, error}));

    const progressAttempt = waitForStepAdvance(step)
        .then((nextState) => (nextState ? {kind: "poll_success" as const, state: nextState} : {kind: "poll_timeout" as const}))
        .catch((error) => ({kind: "poll_error" as const, error}));

    const firstResult = await Promise.race([saveAttempt, progressAttempt]);
    if (firstResult.kind === "poll_success") {
        return firstResult.state;
    }

    if (firstResult.kind === "save_success") {
        if (hasStepActuallyAdvanced(step, firstResult.state)) {
            return firstResult.state;
        }

        const progressResult = await progressAttempt;
        if (progressResult.kind === "poll_success") {
            return progressResult.state;
        }

        return firstResult.state;
    }

    if (firstResult.kind === "save_error") {
        const progressResult = await progressAttempt;
        if (progressResult.kind === "poll_success") {
            return progressResult.state;
        }

        throw firstResult.error;
    }

    const finalSaveResult = await saveAttempt;
    if (finalSaveResult.kind === "save_success") {
        if (hasStepActuallyAdvanced(step, finalSaveResult.state)) {
            return finalSaveResult.state;
        }

        const reconciledState = await getOnboardingState();
        if (hasStepActuallyAdvanced(step, reconciledState)) {
            return reconciledState;
        }

        return finalSaveResult.state;
    }

    throw finalSaveResult.error;
};

export const completeOnboardingWithRetry = async () => {
    try {
        return await completeOnboarding();
    } catch (rawError) {
        const apiError = rawError as ApiError;
        const missingSteps = Array.isArray(apiError.details?.missingSteps) ? apiError.details.missingSteps : [];
        const shouldRetry =
            apiError.status === 409
            && apiError.code === "ONBOARDING_REQUIRED"
            && missingSteps.includes("FIRST_EXPENSES");

        if (!shouldRetry) {
            throw rawError;
        }

        const refreshedState = await getOnboardingState();

        if (!hasFirstExpensesActuallyCompleted(refreshedState)) {
            throw rawError;
        }

        await delay(500);
        return completeOnboarding();
    }
};
