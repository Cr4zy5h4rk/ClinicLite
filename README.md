```markdown
# 🏥 ClinicLite

ClinicLite is a lightweight, offline-first electronic health record (EHR) system built for low-resource environments. It includes a React frontend, an ExpressJS + SQLite backend, and optional local AI assistance through TinyLLaMA (via Ollama on Windows).

---

## 🚀 Features

- Offline-first patient and consultation management  
- Local database sync using PouchDB + SQLite  
- Fully containerized with Docker Compose  
- Optional local LLM support using TinyLLaMA  
- Ultra-lightweight: **~1.15 GB total footprint**

---

## 🧱 Tech Stack

- **Frontend:** React (Vite), PouchDB  
- **Backend:** Node.js (ExpressJS), SQLite  
- **AI:** TinyLLaMA via Ollama (local Windows installation)  
- **DevOps:** Docker & Docker Compose  

---

## 📂 Folder Structure

```

ClinicLite/
├── backend/            # Express + SQLite API
├── frontend/           # React + PouchDB app
├── docker-compose.yml
└── README.md

````

---

## 🛠️ Getting Started

### 1. Clone the repo
```bash
git clone https://github.com/your-org/ClinicLite
cd ClinicLite
````

### 2. Run the stack

```bash
docker-compose up --build
```

### 3. Access

* Frontend → [http://localhost](http://localhost)
* Backend → [http://localhost:3000](http://localhost:3000)
* (Optional) AI → [http://localhost:11434](http://localhost:11434)

---

## 🤖 Local TinyLLaMA Setup (Windows Only)

Ollama is **not included** in the project. Install it manually on Windows:

### 1. Install Ollama

Download: [https://ollama.com/download](https://ollama.com/download)

### 2. Pull TinyLLaMA

Open PowerShell or CMD:

```bash
ollama pull tinyllama
```

### 3. Test the model

```bash
ollama run tinyllama
```

ClinicLite will interact with the local Ollama service automatically if running.

---

## 📈 Future Improvements

* Android mobile app (React Native)
* Medical-oriented LLM with RAG integration
* Biometric authentication (WebAuthn / fingerprint)

---

## 📝 License

MIT License.

```
```
