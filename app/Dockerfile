# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# run as non-root
RUN addgroup -S app && adduser -S app -G app

# install prod deps only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# copy compiled output only
COPY --from=build /app/dist ./dist

USER app
EXPOSE 3000
CMD ["node", "dist/server.js"]

