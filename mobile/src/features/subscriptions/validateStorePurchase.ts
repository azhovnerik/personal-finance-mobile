import { translate } from "../../localization";
import { validateAndroidSubscription, validateIosSubscription } from "./api";
import type { AndroidValidateRequest, IosValidateRequest, StorePurchasePayload } from "./types";

const assertString = (value: string | null | undefined, message: string) => {
  if (!value) {
    throw new Error(message);
  }
  return value;
};

const toIosValidateRequest = (payload: StorePurchasePayload): IosValidateRequest => ({
  externalProductId: payload.externalProductId,
  transactionId: assertString(payload.transactionId, translate("Store transaction is missing transactionId.")),
  originalTransactionId: assertString(
    payload.originalTransactionId,
    translate("Store transaction is missing originalTransactionId."),
  ),
  signedTransactionInfo: assertString(payload.signedTransactionInfo, translate("Store transaction is missing signed payload.")),
});

const toAndroidValidateRequest = (payload: StorePurchasePayload): AndroidValidateRequest => ({
  externalProductId: payload.externalProductId,
  purchaseToken: assertString(payload.purchaseToken, translate("Store transaction is missing purchaseToken.")),
  orderId: assertString(payload.orderId, translate("Store transaction is missing orderId.")),
  packageName: assertString(payload.packageName, translate("Store transaction is missing packageName.")),
});

export const validateStorePurchase = (payload: StorePurchasePayload) => {
  if (payload.platform === "IOS") {
    return validateIosSubscription(toIosValidateRequest(payload));
  }
  return validateAndroidSubscription(toAndroidValidateRequest(payload));
};
