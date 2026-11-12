// Expo Router omits route groups from pathname; the dashboard and welcome screen both use "/".
export const isPublicSubscriptionPath = (pathname: string, firstSegment?: string) =>
  (pathname === "/" && firstSegment !== "(tabs)") || pathname.startsWith("/login")
  || pathname.startsWith("/auth/") || pathname.startsWith("/password/");
