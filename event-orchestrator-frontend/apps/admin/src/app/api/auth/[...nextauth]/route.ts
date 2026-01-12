import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // TODO: Replace with actual backend authentication
        if (credentials?.email === "admin@example.com" && credentials?.password === "admin") {
          return {
            id: "1",
            name: "Admin User",
            email: credentials.email as string,
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
});

export const { GET, POST } = handlers;
