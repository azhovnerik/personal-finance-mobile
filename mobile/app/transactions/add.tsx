import { Redirect } from "expo-router";

export default function EmailAddTransactionRedirect() {
  return <Redirect href="/transactions?openCreate=1" />;
}
