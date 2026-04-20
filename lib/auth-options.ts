import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { 
            role: { 
              include: { permissions: true } 
            } 
          }
        });

        if (!user || !user.aktif) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role?.slug.toUpperCase() || "USER",
          roleSlug: user.role?.slug || "user",
          permissions: user.role?.permissions.map(p => p.slug) || [],
        } as any;
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const dbUser = user as any;
        token.id = dbUser.id;
        token.email = dbUser.email;
        if (dbUser.role) {
          token.role = dbUser.role.toUpperCase();
        }
        if (dbUser.roleSlug) {
          token.roleSlug = dbUser.roleSlug;
        }
        if (dbUser.permissions) {
          token.permissions = dbUser.permissions;
        }
      }
      
      if (trigger === "update" && session?.permissions) {
        token.permissions = session.permissions;
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).roleSlug = token.roleSlug;
        (session.user as any).permissions = token.permissions || [];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
