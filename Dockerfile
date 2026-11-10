FROM node:22-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/grh.db
WORKDIR /app
COPY --from=build /app ./
COPY docker/entrypoint.sh /usr/local/bin/grh-entrypoint
RUN chmod +x /usr/local/bin/grh-entrypoint \
    && mkdir -p /app/data /app/storage /app/backups \
    && chown -R node:node /app
USER node
EXPOSE 3000
ENTRYPOINT ["/usr/local/bin/grh-entrypoint"]
