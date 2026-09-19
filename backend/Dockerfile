FROM node:20-alpine
# Prisma needs the openssl CLI to detect the right engine (openssl-3.0.x musl
# build). Without it, generate falls back to the 1.1.x engine and the API
# crashes on first DB access with "libssl.so.1.1: No such file or directory".
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "dev"]
