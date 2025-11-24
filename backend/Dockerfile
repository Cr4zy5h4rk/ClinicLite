# Stage de build
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer toutes les dépendances (y compris les devDependencies)
RUN npm install

# Copie du code source
COPY . .

# Stage final
FROM node:18-alpine

# Installer les dépendances système nécessaires pour SQLite et PDFKit
RUN apk add --no-cache \
    sqlite \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev

# Créer un utilisateur non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Définir le répertoire de travail
WORKDIR /app

# Copier les dépendances du stage de build
COPY --from=builder /app/node_modules ./node_modules

# Copier le reste des fichiers de l'application
COPY . .

# Donner les permissions nécessaires à l'utilisateur non-root
RUN chown -R appuser:appgroup /app

# Utiliser l'utilisateur non-root
USER appuser

# Exposer le port
EXPOSE 3000

# Définir les variables d'environnement
ENV NODE_ENV=production

# Commande de démarrage
CMD ["node", "server.js"] 