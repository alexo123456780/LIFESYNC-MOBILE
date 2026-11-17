# Contexto de build: la raíz del repo (docker build -f apps/api/Dockerfile .).
# `prod` DEBE ser la última etapa: Render construye la última por defecto y Compose usa `target: dev`.

FROM node:24-alpine AS base
WORKDIR /app
# El script `prepare` (husky) no aplica dentro de la imagen.
ENV HUSKY=0
# El postinstall de apps/api ejecuta `prisma generate`, que necesita el esquema.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY apps/api/prisma apps/api/prisma
COPY apps/mobile/package.json apps/mobile/

FROM base AS dev
RUN npm ci -w apps/api
COPY apps/api apps/api
WORKDIR /app/apps/api
EXPOSE 3000
# El volumen de Compose oculta el cliente generado: se regenera y se migra al arrancar.
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run start:dev"]

FROM base AS build
RUN npm ci -w apps/api
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM base AS prod-deps
RUN npm ci -w apps/api --omit=dev

FROM node:24-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=prod-deps --chown=node:node /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --chown=node:node apps/api/package.json apps/api/prisma.config.ts apps/api/
COPY --chown=node:node apps/api/prisma apps/api/prisma
USER node
WORKDIR /app/apps/api
EXPOSE 3000
# El plan gratuito de Render no tiene pre-deploy command: las migraciones corren al arrancar.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
