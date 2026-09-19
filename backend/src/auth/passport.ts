import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const clientID = process.env.GITHUB_CLIENT_ID ?? "";
const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";
const callbackURL =
  process.env.GITHUB_CALLBACK_URL ??
  "http://localhost:4000/auth/github/callback";

passport.use(
  new GitHubStrategy(
    { clientID, clientSecret, callbackURL },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: any,
      done: (err: any, user?: any) => void
    ) => {
      try {
        const email: string | undefined =
          profile.emails?.[0]?.value ?? undefined;
        const user = await prisma.user.upsert({
          where: {
            oauthProvider_oauthId: {
              oauthProvider: "github",
              oauthId: profile.id as string,
            },
          },
          update: {
            name: profile.displayName ?? profile.username,
            email,
            avatarUrl: profile.photos?.[0]?.value,
          },
          create: {
            oauthProvider: "github",
            oauthId: profile.id as string,
            name: profile.displayName ?? profile.username,
            email,
            avatarUrl: profile.photos?.[0]?.value,
          },
        });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id as string);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

export default passport;
