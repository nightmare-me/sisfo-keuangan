import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth-options";

export function auth() {
  return getServerSession(authOptions);
}

export { authOptions };
