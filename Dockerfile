FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist
COPY server.js ./
COPY prompts.js ./

ENV PORT=3001
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server.js"]