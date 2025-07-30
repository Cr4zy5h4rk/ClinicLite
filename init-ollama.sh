echo "Attente du démarrage d'Ollama..."
sleep 15

echo "Téléchargement de TinyLlama..."
ollama pull tinyllama

echo "Vérification des modèles installés..."
ollama list

echo "TinyLlama installé avec succès!"