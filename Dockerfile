FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Matches CI / production upstream; overrides client bundle URLs use workflow env at `next build` time only.
ENV GANJOOR_API_BASE_URL=https://api.ganjoor.net

COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

EXPOSE 3000
CMD ["node", "server.js"]
