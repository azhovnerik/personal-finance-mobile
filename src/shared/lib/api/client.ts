import createClient from "openapi-fetch";

import type { paths } from "./sdk";

const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const client = createClient<paths>({
  baseUrl,
});

export default client;
