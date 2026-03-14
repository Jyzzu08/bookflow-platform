FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
COPY test ./test
EXPOSE 3002
CMD ["npm", "start"]
