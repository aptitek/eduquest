FROM node:22-bookworm-slim

WORKDIR /workspace

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV WRANGLER_SEND_METRICS=false
ARG NPM_LOGLEVEL=notice

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install --loglevel=${NPM_LOGLEVEL}

COPY . .

EXPOSE 5173 8787

CMD ["npm", "run", "dev"]
