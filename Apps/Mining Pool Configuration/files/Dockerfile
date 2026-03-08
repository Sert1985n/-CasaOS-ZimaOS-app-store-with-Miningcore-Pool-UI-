FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js coins.defaults.json ./
ENV PORT=4050
EXPOSE 4050
CMD ["node","server.js"]
