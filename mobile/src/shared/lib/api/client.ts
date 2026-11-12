import createClient from "openapi-fetch";
import { financialFetch } from "../../../features/subscriptions/financialAccessEvents";

import type { paths } from "./sdk";
import { API_BASE_URL } from "./config";

const client = createClient<paths>({
  baseUrl: API_BASE_URL,
  fetch: financialFetch,
});

export default client;
