FROM node:22-alpine

WORKDIR /workspace

COPY shared/package.json shared/package-lock.json shared/tsconfig.json ./shared/
COPY shared/src ./shared/src
RUN npm --prefix ./shared ci && npm --prefix ./shared run build

COPY xypes-identity-engine/package.json xypes-identity-engine/tsconfig.json ./xypes-identity-engine/
RUN npm --prefix ./xypes-identity-engine install

COPY xypes-identity-engine/src ./xypes-identity-engine/src
COPY xypes-identity-engine/sql ./xypes-identity-engine/sql
RUN npm --prefix ./xypes-identity-engine run build

WORKDIR /workspace/xypes-identity-engine

ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]