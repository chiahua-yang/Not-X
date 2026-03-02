import { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const providers = [] as any[];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Allow same email to link another Google identity (e.g. second Google account).
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

providers.push(
  Credentials({
    id: "credentials",
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email;
      const password = credentials?.password;

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      const normalizedEmail = email.trim().toLowerCase();

      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (!user || !user.passwordHash) {
        throw new Error("Invalid email or password");
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        email: user.email ?? undefined,
        name: user.displayName ?? user.name ?? undefined,
      };
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/",
    newUser: "/setup-username",
  },
  callbacks: {
    async signIn({ user, account }) {
      // Remember which provider was used so we show it correctly in "Continue with account".
      if (account?.provider && user?.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: { lastSignInProvider: account.provider },
          });
        } catch {
          // ignore update errors
        }
      }
      return true;
    },
    async session({ session, user }) {
      // Attach userId to session for easy access
      if (user && session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { userId: true, id: true },
        });
        (session.user as any).id = user.id;
        (session.user as any).userId = dbUser?.userId || null;
      }
      return session;
    },
  },
};
