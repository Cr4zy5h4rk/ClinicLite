# Stage de build
FROM node:18-alpine AS builder

# Définition du répertoire de travail
WORKDIR /app

# Installation des dépendances nécessaires pour le build
RUN apk add --no-cache python3 make g++

# Copie des fichiers de dépendances
COPY package*.json ./

# Installation des dépendances
RUN npm ci

# Copie du code source
COPY . .

# Build de l'application
RUN npm run build

# Stage de production
FROM nginx:alpine

# Copie de la configuration nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copie des fichiers buildés depuis le stage de build
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposition du port 80
EXPOSE 80

# Configuration pour le support du routing React
CMD ["nginx", "-g", "daemon off;"] 