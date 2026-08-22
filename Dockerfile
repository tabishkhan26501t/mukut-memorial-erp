# Demo / production single-service image: builds client and runs server
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
COPY server/package.json ./server/package.json
COPY client/package.json ./client/package.json
RUN npm run install:all

COPY . .
# Generate Prisma client and build frontend
RUN cd server && npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/package.json ./package.json
# Only production deps for server
RUN cd server && npm ci --omit=dev && npx prisma generate
EXPOSE 5000
CMD ["node", "server/index.js"]
