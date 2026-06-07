FROM node:20-alpine
WORKDIR /app
COPY package.json ./
# Solo instala dependencias necesarias para el servidor (express, socket.io, cors)
RUN npm install --omit=dev
# Copiamos la interfaz ya compilada, el servidor y los mapas
COPY dist ./dist
COPY data ./data
COPY server.cjs ./

EXPOSE 3000
CMD ["npm", "start"]
