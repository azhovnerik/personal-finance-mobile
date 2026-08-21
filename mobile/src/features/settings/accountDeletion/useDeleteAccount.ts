import { useMutation } from "@tanstack/react-query";

import { deleteAccount } from "./api";

export const useDeleteAccount = () => useMutation({ mutationFn: deleteAccount });
