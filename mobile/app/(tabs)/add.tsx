import { useRouter } from "expo-router";

import { CreateTransactionModal } from "../../src/features/transactions/create/CreateTransactionModal";

export default function AddTransactionScreen() {
  const router = useRouter();

  return <CreateTransactionModal visible onClose={() => router.replace("/(tabs)")} />;
}
