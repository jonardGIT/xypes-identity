FROM node:22-alpine

WORKDIR /workspace

COPY shared ./shared
RUN if [ -f ./shared/package-lock.json ]; then npm --prefix ./shared ci; else npm --prefix ./shared install; fi \
    && npm --prefix ./shared run build

COPY xypes-identity-sdk ./xypes-identity-sdk
RUN if [ -f ./xypes-identity-sdk/package-lock.json ]; then npm --prefix ./xypes-identity-sdk ci; else npm --prefix ./xypes-identity-sdk install; fi \
    && npm --prefix ./xypes-identity-sdk run build

COPY xypes-identity-admin ./xypes-identity-admin
RUN if [ -f ./xypes-identity-admin/package-lock.json ]; then npm --prefix ./xypes-identity-admin ci; else npm --prefix ./xypes-identity-admin install; fi \
    && npm --prefix ./xypes-identity-admin run build

WORKDIR /workspace/xypes-identity-admin

ENV PORT=3001

EXPOSE 3001

CMD ["npm", "start"]