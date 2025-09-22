FROM node:20-bullseye

# Install runtimes/compilers needed by the judge
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      python3 \
      g++ \
      openjdk-17-jre-headless \
      openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
# Render sets PORT; we honor it in server.js
EXPOSE 4001

CMD ["node", "server.js"]


