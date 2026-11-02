# CLPS Lunar Mission Browser: web app + REST API in one small container
#   docker build -t clps-browser .
#   docker run -p 8080:8080 clps-browser      -> http://localhost:8080
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY data ./data
COPY server ./server
COPY dist ./dist
COPY cli.js build.js openapi.yaml ./
ENV PORT=8080 NODE_ENV=production
EXPOSE 8080
USER node
HEALTHCHECK CMD wget -qO- http://localhost:8080/api/health || exit 1
CMD ["node", "server/server.js"]
