import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRateLimited, rateLimited } from "@/lib/rate-limit";

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
const DUMMY_HASH = bcrypt.hashSync("timing-equalizer", 10);

class LoginError extends CredentialsSignin {
  constructor(code: "invalid" | "locked" | "rate" | "pending" | "rejected") {
    super();
    this.code = code;
  }
}

const credentialsSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 30 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw, request) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) throw new LoginError("invalid");
        const { email, password } = parsed.data;
        const ip =
          request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          "local";
        if (
          isRateLimited(`login:${ip}`, 30) ||
          isRateLimited(`login:${email}`, 10)
        )
          throw new LoginError("rate");
        const fail = (code: "invalid" | "locked") => {
          rateLimited(`login:${ip}`, 30);
          rateLimited(`login:${email}`, 10);
          return new LoginError(code);
        };

        const user = await prisma.user.findUnique({ where: { email } });
        // même message pour compte inconnu / désactivé / mauvais mot de passe (pas d'énumération)
        if (!user) {
          await bcrypt.compare(password, DUMMY_HASH); // temps constant
          throw fail("invalid");
        }
        if (user.lockedUntil && user.lockedUntil > new Date())
          throw new LoginError("locked");

        if (!(await bcrypt.compare(password, user.passwordHash))) {
          const failed = user.failedAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedAttempts: failed >= MAX_FAILED ? 0 : failed,
              lockedUntil:
                failed >= MAX_FAILED
                  ? new Date(Date.now() + LOCK_MINUTES * 60_000)
                  : null,
            },
          });
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: "auth.login_failed",
              entity: "User",
              entityId: user.id,
              ip,
            },
          });
          throw fail(failed >= MAX_FAILED ? "locked" : "invalid");
        }

        // mot de passe correct : l'état du compte peut être expliqué sans permettre l'énumération
        if (user.approvalStatus === "PENDING") throw new LoginError("pending");
        if (user.approvalStatus === "REJECTED") throw new LoginError("rejected");
        if (!user.isActive) throw fail("invalid");

        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "auth.login",
            entity: "User",
            entityId: user.id,
            ip,
          },
        });
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
