FROM node:20-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Construir el frontend de Vite
RUN npm run build

# Exponer el puerto
EXPOSE 3000

# Iniciar el servidor
CMD ["npm", "start"]
