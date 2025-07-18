const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Clé secrète pour JWT
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = '24h';

// Middleware
app.use(cors());
app.use(express.json());

// Connexion à la base de données SQLite
const dbPath = process.env.DB_PATH || path.join(__dirname, 'hospital.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
  } else {
    console.log('Connecté à la base de données SQLite:', dbPath);
  }
});

// Middleware d'authentification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// Création des tables
const createTables = () => {
  // Table patients
  db.run(`
    CREATE TABLE IF NOT EXISTS patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      dateNaissance DATE NOT NULL,
      sexe TEXT CHECK(sexe IN ('M', 'F')) NOT NULL,
      telephone TEXT,
      adresse TEXT,
      profession TEXT,
      situationMatrimoniale TEXT,
      contactUrgence TEXT,
      status TEXT CHECK(status IN ('synced', 'pending', 'offline')) DEFAULT 'synced',
      numeroPatient TEXT UNIQUE,
      dateEnregistrement DATE DEFAULT CURRENT_DATE,
      lastVisit DATE,
      consultations INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Table antecedents
  db.run(`
    CREATE TABLE IF NOT EXISTS antecedents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId INTEGER NOT NULL,
      type TEXT CHECK(type IN ('Médical', 'Chirurgical', 'Familial', 'Allergique')) NOT NULL,
      description TEXT NOT NULL,
      date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Table consultations
  db.run(`
    CREATE TABLE IF NOT EXISTS consultations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId INTEGER NOT NULL,
      date DATE NOT NULL,
      updated_at DATE NOT NULL DEFAULT CURRENT_DATE,
      motif TEXT NOT NULL,
      diagnostic TEXT,
      medecin TEXT NOT NULL,
      status TEXT CHECK(status IN ('terminée', 'en_cours', 'programmée')) DEFAULT 'terminée',
      poids TEXT,
      taille TEXT,
      tension TEXT,
      temperature TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Table vaccinations
  db.run(`
    CREATE TABLE IF NOT EXISTS vaccinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId INTEGER NOT NULL,
      vaccin TEXT NOT NULL,
      lot TEXT,
      dateAdministration DATE NOT NULL,
      prochainRappel DATE,
      status TEXT CHECK(status IN ('à jour', 'bientôt', 'retard')) DEFAULT 'à jour',
      administrePar TEXT,
      reactions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Table notes
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patientId INTEGER NOT NULL,
      date DATE NOT NULL,
      auteur TEXT NOT NULL,
      contenu TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patientId) REFERENCES patients(id) ON DELETE CASCADE
    )
  `);

  // Table users
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'doctor', 'nurse')) NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      email TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Tables créées avec succès');
};

// Insertion des données de test
const insertTestData = () => {
  // Patients
  const patients = [
    {
      nom: 'Kouassi',
      prenom: 'Marie',
      dateNaissance: '1990-05-15',
      sexe: 'F',
      telephone: '+225 07 12 34 56',
      adresse: 'Abidjan, Cocody',
      profession: 'Enseignante',
      situationMatrimoniale: 'Mariée',
      contactUrgence: '+225 07 98 76 54',
      status: 'synced',
      numeroPatient: 'P001234',
      dateEnregistrement: '2023-06-15',
      lastVisit: '2024-01-15',
      consultations: 5
    },
    {
      nom: 'Traore',
      prenom: 'Ibrahim',
      dateNaissance: '1985-12-03',
      sexe: 'M',
      telephone: '+225 05 98 76 54',
      adresse: 'Bouaké Centre',
      profession: 'Commerçant',
      situationMatrimoniale: 'Marié',
      contactUrgence: '+225 05 11 22 33',
      status: 'pending',
      numeroPatient: 'P001235',
      dateEnregistrement: '2023-07-20',
      lastVisit: '2024-01-10',
      consultations: 12
    },
    {
      nom: 'Kone',
      prenom: 'Aminata',
      dateNaissance: '2010-08-22',
      sexe: 'F',
      telephone: '+225 01 23 45 67',
      adresse: 'Yamoussoukro',
      profession: 'Étudiante',
      situationMatrimoniale: 'Célibataire',
      contactUrgence: '+225 01 98 76 54',
      status: 'offline',
      numeroPatient: 'P001236',
      dateEnregistrement: '2023-08-10',
      lastVisit: '2024-01-08',
      consultations: 3
    },
    {
      nom: 'Ouattara',
      prenom: 'Sekou',
      dateNaissance: '1978-03-10',
      sexe: 'M',
      telephone: '+225 07 89 01 23',
      adresse: 'Man Centre',
      profession: 'Agriculteur',
      situationMatrimoniale: 'Marié',
      contactUrgence: '+225 07 55 44 33',
      status: 'synced',
      numeroPatient: 'P001237',
      dateEnregistrement: '2023-09-05',
      lastVisit: '2024-01-12',
      consultations: 8
    },
    {
      nom: 'Fall',
      prenom: 'Diouma',
      dateNaissance: '1978-03-10',
      sexe: 'M',
      telephone: '+225 07 89 01 23',
      adresse: 'Man Centre',
      profession: 'Agriculteur',
      situationMatrimoniale: 'Marié',
      contactUrgence: '+225 07 55 44 33',
      status: 'synced',
      numeroPatient: 'P001237',
      dateEnregistrement: '2023-09-05',
      lastVisit: '2024-01-12',
      consultations: 8
    }
  ];

  // Insertion des patients
  patients.forEach((patient, index) => {
    db.run(`
      INSERT INTO patients (
        nom, prenom, dateNaissance, sexe, telephone, adresse, profession,
        situationMatrimoniale, contactUrgence, status, numeroPatient,
        dateEnregistrement, lastVisit, consultations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      patient.nom, patient.prenom, patient.dateNaissance, patient.sexe,
      patient.telephone, patient.adresse, patient.profession,
      patient.situationMatrimoniale, patient.contactUrgence, patient.status,
      patient.numeroPatient, patient.dateEnregistrement, patient.lastVisit,
      patient.consultations
    ], function(err) {
      if (err) {
        console.error('Erreur insertion patient:', err.message);
      } else {
        console.log(`Patient ${patient.nom} ${patient.prenom} inséré avec ID: ${this.lastID}`);
        
        // Insertion des antécédents pour Marie Kouassi (ID 1)
        if (index === 0) {
          const antecedents = [
            { type: 'Médical', description: 'Hypertension artérielle', date: '2020-03-10' },
            { type: 'Chirurgical', description: 'Césarienne', date: '2018-12-15' },
            { type: 'Familial', description: 'Diabète (mère)', date: '2023-01-10' },
            { type: 'Allergique', description: 'Pénicilline', date: '2019-08-05' }
          ];

          antecedents.forEach(ant => {
            db.run(`
              INSERT INTO antecedents (patientId, type, description, date)
              VALUES (?, ?, ?, ?)
            `, [this.lastID, ant.type, ant.description, ant.date]);
          });

          // Insertion des consultations
          const consultations = [
            {
              date: '2024-01-15',
              motif: 'Contrôle hypertension',
              diagnostic: 'HTA bien contrôlée',
              medecin: 'Dr. Konan',
              status: 'terminée',
              poids: '68kg',
              taille: '165cm',
              tension: '130/80',
              temperature: '36.5°C'
            },
            {
              date: '2024-01-08',
              motif: 'Maux de tête récurrents',
              diagnostic: 'Céphalées de tension',
              medecin: 'Dr. Konan',
              status: 'terminée',
              poids: '67kg',
              taille: '165cm',
              tension: '135/85',
              temperature: '36.8°C'
            },
            {
              date: '2023-12-20',
              motif: 'Suivi grossesse',
              diagnostic: 'Grossesse normale - 32 SA',
              medecin: 'Dr. Kouamé',
              status: 'terminée',
              poids: '72kg',
              taille: '165cm',
              tension: '125/75',
              temperature: '36.6°C'
            }
          ];

          consultations.forEach(cons => {
            db.run(`
              INSERT INTO consultations (
                patientId, date, motif, diagnostic, medecin, status,
                poids, taille, tension, temperature
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              this.lastID, cons.date, cons.motif, cons.diagnostic,
              cons.medecin, cons.status, cons.poids, cons.taille,
              cons.tension, cons.temperature
            ]);
          });

          // Insertion des vaccinations
          const vaccinations = [
            { vaccin: 'Tétanos', dateAdministration: '2023-05-12', prochainRappel: '2033-05-12', status: 'à jour', administrePar: 'Inf. Diabé' },
            { vaccin: 'Hépatite B', dateAdministration: '2022-01-15', prochainRappel: '2027-01-15', status: 'à jour', administrePar: 'Dr. Konan' },
            { vaccin: 'Fièvre jaune', dateAdministration: '2020-08-10', prochainRappel: '2030-08-10', status: 'à jour', administrePar: 'Inf. Kone' },
            { vaccin: 'COVID-19', dateAdministration: '2023-11-20', prochainRappel: '2024-11-20', status: 'bientôt', administrePar: 'Dr. Kouamé' }
          ];

          vaccinations.forEach(vacc => {
            db.run(`
              INSERT INTO vaccinations (
                patientId, vaccin, dateAdministration, prochainRappel, status, administrePar
              ) VALUES (?, ?, ?, ?, ?, ?)
            `, [this.lastID, vacc.vaccin, vacc.dateAdministration, vacc.prochainRappel, vacc.status, vacc.administrePar]);
          });

          // Insertion des notes
          const notes = [
            { date: '2024-01-15', auteur: 'Dr. Konan', contenu: 'Patiente très coopérative. Bon suivi du traitement antihypertenseur.' },
            { date: '2024-01-08', auteur: 'Inf. Diabé', contenu: 'Education thérapeutique réalisée sur la gestion du stress.' }
          ];

          notes.forEach(note => {
            db.run(`
              INSERT INTO notes (patientId, date, auteur, contenu)
              VALUES (?, ?, ?, ?)
            `, [this.lastID, note.date, note.auteur, note.contenu]);
          });
        }
      }
    });
  });
};

// Insertion d'utilisateurs de test
const insertTestUsers = async () => {
  const users = [
    {
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      nom: 'Admin',
      prenom: 'System',
      email: 'admin@clinique.com'
    },
    {
      username: 'drkonan',
      password: await bcrypt.hash('doctor123', 10),
      role: 'doctor',
      nom: 'Konan',
      prenom: 'Pierre',
      email: 'drkonan@clinique.com'
    }
  ];

  users.forEach(user => {
    db.run(`
      INSERT INTO users (username, password, role, nom, prenom, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.username, user.password, user.role, user.nom, user.prenom, user.email]);
  });
};

// Routes API

// GET - Récupérer tous les patients
app.get('/api/patients', (req, res) => {
  db.all('SELECT * FROM patients ORDER BY nom, prenom', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET - Récupérer un patient par ID
app.get('/api/patients/:id', (req, res) => {
  const patientId = req.params.id;
  
  db.get('SELECT * FROM patients WHERE id = ?', [patientId], (err, patient) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!patient) {
      res.status(404).json({ error: 'Patient non trouvé' });
    } else {
      res.json(patient);
    }
  });
});

// GET - Récupérer les antécédents d'un patient
app.get('/api/patients/:id/antecedents', (req, res) => {
  const patientId = req.params.id;
  
  db.all('SELECT * FROM antecedents WHERE patientId = ? ORDER BY date DESC', [patientId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET - Récupérer les consultations d'un patient
app.get('/api/patients/:id/consultations', (req, res) => {
  const patientId = req.params.id;
  
  db.all('SELECT * FROM consultations WHERE patientId = ? ORDER BY date DESC', [patientId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET - Récupérer les vaccinations d'un patient
app.get('/api/patients/:id/vaccinations', (req, res) => {
  const patientId = req.params.id;
  
  db.all('SELECT * FROM vaccinations WHERE patientId = ? ORDER BY dateAdministration DESC', [patientId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET - Récupérer les notes d'un patient
app.get('/api/patients/:id/notes', (req, res) => {
  const patientId = req.params.id;
  
  db.all('SELECT * FROM notes WHERE patientId = ? ORDER BY date DESC', [patientId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST - Créer un nouveau patient
app.post('/api/patients', (req, res) => {
  const {
    nom, prenom, dateNaissance, sexe, telephone, adresse,
    profession, situationMatrimoniale, contactUrgence, numeroPatient
  } = req.body;

  db.run(`
    INSERT INTO patients (
      nom, prenom, dateNaissance, sexe, telephone, adresse,
      profession, situationMatrimoniale, contactUrgence, numeroPatient
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    nom, prenom, dateNaissance, sexe, telephone, adresse,
    profession, situationMatrimoniale, contactUrgence, numeroPatient
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ id: this.lastID, message: 'Patient créé avec succès' });
    }
  });
});

// PUT - Mettre à jour un patient
app.put('/api/patients/:id', (req, res) => {
  const patientId = req.params.id;
  const {
    nom, prenom, dateNaissance, sexe, telephone, adresse,
    profession, situationMatrimoniale, contactUrgence, status
  } = req.body;

  db.run(`
    UPDATE patients SET
      nom = ?, prenom = ?, dateNaissance = ?, sexe = ?, telephone = ?,
      adresse = ?, profession = ?, situationMatrimoniale = ?,
      contactUrgence = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    nom, prenom, dateNaissance, sexe, telephone, adresse,
    profession, situationMatrimoniale, contactUrgence, status, patientId
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Patient mis à jour avec succès' });
    }
  });
});

// DELETE - Supprimer un patient
app.delete('/api/patients/:id', (req, res) => {
  const patientId = req.params.id;
  
  db.run('DELETE FROM patients WHERE id = ?', [patientId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Patient supprimé avec succès' });
    }
  });
});

// POST - Créer une nouvelle consultation
app.post('/api/consultations', (req, res) => {
  const {
    patientId, date, motif, symptomes, diagnostic, traitement,
    observations, duree, prochainRdv, medecin, status,
    poids, taille, tension, temperature, pouls, frequenceRespiratoire
  } = req.body;

  // Validation des champs obligatoires
  if (!patientId || !motif || !diagnostic || !medecin) {
    return res.status(400).json({ 
      error: 'Champs obligatoires manquants: patientId, motif, diagnostic, medecin' 
    });
  }

  db.run(`
    INSERT INTO consultations (
      patientId, date, motif, diagnostic, medecin, status,
      poids, taille, tension, temperature, pouls, frequenceRespiratoire,
      symptomes, traitement, observations, duree, prochainRdv
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    patientId, date || new Date().toISOString().split('T')[0], motif, diagnostic, medecin, status || 'terminée',
    poids, taille, tension, temperature, pouls, frequenceRespiratoire,
    symptomes, traitement, observations, duree, prochainRdv
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Mettre à jour le nombre de consultations du patient
      db.run('UPDATE patients SET consultations = consultations + 1, lastVisit = ? WHERE id = ?', 
        [date || new Date().toISOString().split('T')[0], patientId]);
      
      res.json({ 
        id: this.lastID, 
        message: 'Consultation créée avec succès',
        consultation: {
          id: this.lastID,
          patientId,
          date: date || new Date().toISOString().split('T')[0],
          motif,
          diagnostic,
          medecin,
          status: status || 'terminée'
        }
      });
    }
  });
});

// GET - Récupérer toutes les consultations
app.get('/api/consultations', (req, res) => {
  const { patientId, limit = 50, offset = 0 } = req.query;
  
  let query = `
    SELECT c.*, p.nom, p.prenom, p.numeroPatient
    FROM consultations c
    JOIN patients p ON c.patientId = p.id
  `;
  let params = [];
  
  if (patientId) {
    query += ' WHERE c.patientId = ?';
    params.push(patientId);
  }
  
  query += ' ORDER BY c.date DESC, c.created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET - Récupérer une consultation par ID
app.get('/api/consultations/:id', (req, res) => {
  const consultationId = req.params.id;
  
  db.get(`
    SELECT c.*, p.nom, p.prenom, p.numeroPatient, p.telephone
    FROM consultations c
    JOIN patients p ON c.patientId = p.id
    WHERE c.id = ?
  `, [consultationId], (err, consultation) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!consultation) {
      res.status(404).json({ error: 'Consultation non trouvée' });
    } else {
      res.json(consultation);
    }
  });
});

// PUT - Mettre à jour une consultation
app.put('/api/consultations/:id', (req, res) => {
  const consultationId = req.params.id;
  const {
    date, motif, symptomes, diagnostic, traitement,
    observations, duree, prochainRdv, medecin, status,
    poids, taille, tension, temperature, pouls, frequenceRespiratoire
  } = req.body;

  db.run(`
    UPDATE consultations SET
      date = ?, motif = ?, symptomes = ?, diagnostic = ?, traitement = ?,
      observations = ?, duree = ?, prochainRdv = ?, medecin = ?, status = ?,
      poids = ?, taille = ?, tension = ?, temperature = ?, pouls = ?,
      frequenceRespiratoire = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [
    date, motif, symptomes, diagnostic, traitement,
    observations, duree, prochainRdv, medecin, status,
    poids, taille, tension, temperature, pouls, frequenceRespiratoire,
    consultationId
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Consultation non trouvée' });
    } else {
      res.json({ message: 'Consultation mise à jour avec succès' });
    }
  });
});

// DELETE - Supprimer une consultation
app.delete('/api/consultations/:id', (req, res) => {
  const consultationId = req.params.id;
  
  // Récupérer l'ID du patient avant suppression pour mettre à jour le compteur
  db.get('SELECT patientId FROM consultations WHERE id = ?', [consultationId], (err, consultation) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!consultation) {
      res.status(404).json({ error: 'Consultation non trouvée' });
    } else {
      // Supprimer la consultation
      db.run('DELETE FROM consultations WHERE id = ?', [consultationId], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          // Mettre à jour le compteur de consultations du patient
          db.run('UPDATE patients SET consultations = consultations - 1 WHERE id = ?', 
            [consultation.patientId]);
          
          res.json({ message: 'Consultation supprimée avec succès' });
        }
      });
    }
  });
});

// GET - Rechercher des consultations
app.get('/api/consultations/search', (req, res) => {
  const { q, motif, diagnostic, medecin, dateFrom, dateTo } = req.query;
  
  let query = `
    SELECT c.*, p.nom, p.prenom, p.numeroPatient
    FROM consultations c
    JOIN patients p ON c.patientId = p.id
    WHERE 1=1
  `;
  let params = [];
  
  if (q) {
    query += ' AND (c.motif LIKE ? OR c.diagnostic LIKE ? OR c.symptomes LIKE ? OR p.nom LIKE ? OR p.prenom LIKE ?)';
    const searchTerm = `%${q}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }
  
  if (motif) {
    query += ' AND c.motif LIKE ?';
    params.push(`%${motif}%`);
  }
  
  if (diagnostic) {
    query += ' AND c.diagnostic LIKE ?';
    params.push(`%${diagnostic}%`);
  }
  
  if (medecin) {
    query += ' AND c.medecin LIKE ?';
    params.push(`%${medecin}%`);
  }
  
  if (dateFrom) {
    query += ' AND c.date >= ?';
    params.push(dateFrom);
  }
  
  if (dateTo) {
    query += ' AND c.date <= ?';
    params.push(dateTo);
  }
  
  query += ' ORDER BY c.date DESC, c.created_at DESC LIMIT 100';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// GET - Statistiques des consultations
app.get('/api/consultations/stats', (req, res) => {
  const { patientId, medecin, dateFrom, dateTo } = req.query;
  
  let whereClause = 'WHERE 1=1';
  let params = [];
  
  if (patientId) {
    whereClause += ' AND patientId = ?';
    params.push(patientId);
  }
  
  if (medecin) {
    whereClause += ' AND medecin = ?';
    params.push(medecin);
  }
  
  if (dateFrom) {
    whereClause += ' AND date >= ?';
    params.push(dateFrom);
  }
  
  if (dateTo) {
    whereClause += ' AND date <= ?';
    params.push(dateTo);
  }
  
  // Requête pour les statistiques globales
  db.get(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'terminée' THEN 1 END) as terminees,
      COUNT(CASE WHEN status = 'en_cours' THEN 1 END) as en_cours,
      COUNT(CASE WHEN status = 'programmée' THEN 1 END) as programmees,
      AVG(CAST(duree AS INTEGER)) as duree_moyenne
    FROM consultations ${whereClause}
  `, params, (err, stats) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      // Requête pour les motifs les plus fréquents
      db.all(`
        SELECT motif, COUNT(*) as count
        FROM consultations ${whereClause}
        GROUP BY motif
        ORDER BY count DESC
        LIMIT 10
      `, params, (err, motifs) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          res.json({
            ...stats,
            motifs_frequents: motifs
          });
        }
      });
    }
  });
});

// Route pour générer un certificat de vaccination PDF
app.get('/api/patients/:id/vaccinations/certificate', async (req, res) => {
  const patientId = req.params.id;
  
  try {
    // Récupérer les données du patient et ses vaccinations
    const [patient, vaccinations] = await Promise.all([
      new Promise((resolve, reject) => {
        db.get('SELECT * FROM patients WHERE id = ?', [patientId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }),
      new Promise((resolve, reject) => {
        db.all('SELECT * FROM vaccinations WHERE patientId = ? ORDER BY dateAdministration DESC', [patientId], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      })
    ]);

    if (!patient) {
      return res.status(404).json({ error: 'Patient non trouvé' });
    }

    // Créer le document PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    
    // Configurer l'en-tête pour le téléchargement
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=certificat_vaccination_${patient.numeroPatient}.pdf`);
    
    // Pipe le PDF directement à la réponse HTTP
    doc.pipe(res);

    // Ajouter le contenu du PDF
    addCertificateHeader(doc);
    addPatientInfo(doc, patient);
    addVaccinationsTable(doc, vaccinations);
    addCertificateFooter(doc);

    // Finaliser le PDF
    doc.end();

  } catch (err) {
    console.error('Erreur génération certificat:', err);
    res.status(500).json({ error: 'Erreur lors de la génération du certificat' });
  }
});

// Fonctions utilitaires pour la génération du PDF
function addCertificateHeader(doc) {
  doc
    .image(path.join(__dirname, 'assets', 'logo.png'), 50, 50, { width: 100 })
    .fillColor('#444444')
    .fontSize(20)
    .text('CERTIFICAT DE VACCINATION', 200, 65, { align: 'center' })
    .fontSize(10)
    .text('Hôpital Général', 200, 90, { align: 'center' })
    .moveDown();
}

function addPatientInfo(doc, patient) {
  doc
    .fillColor('#444444')
    .fontSize(14)
    .text('Informations du patient:', 50, 140)
    .fontSize(12)
    .text(`Nom complet: ${patient.nom} ${patient.prenom}`, 50, 160)
    .text(`Numéro patient: ${patient.numeroPatient}`, 50, 175)
    .text(`Date de naissance: ${new Date(patient.dateNaissance).toLocaleDateString('fr-FR')}`, 50, 190)
    .text(`Sexe: ${patient.sexe === 'M' ? 'Masculin' : 'Féminin'}`, 50, 205)
    .moveDown();
}

function addVaccinationsTable(doc, vaccinations) {
  doc
    .fillColor('#444444')
    .fontSize(14)
    .text('Vaccinations administrées:', 50, 240)
    .moveDown();

  if (vaccinations.length === 0) {
    doc
      .fontSize(12)
      .text('Aucune vaccination enregistrée pour ce patient.', 50, 260);
    return;
  }

  // En-tête du tableau
  const tableTop = 260;
  const leftCol = 50;
  const middleCol = 250;
  const rightCol = 400;

  doc
    .fontSize(12)
    .text('Vaccin', leftCol, tableTop)
    .text('Date', middleCol, tableTop)
    .text('Prochain rappel', rightCol, tableTop)
    .moveTo(50, tableTop + 20)
    .lineTo(550, tableTop + 20)
    .stroke();

  // Contenu du tableau
  let y = tableTop + 30;
  vaccinations.forEach((vaccination, index) => {
    doc
      .fontSize(10)
      .text(vaccination.vaccin, leftCol, y)
      .text(new Date(vaccination.dateAdministration).toLocaleDateString('fr-FR'), middleCol, y)
      .text(vaccination.prochainRappel 
        ? new Date(vaccination.prochainRappel).toLocaleDateString('fr-FR')
        : 'N/A', rightCol, y);

    y += 20;
    
    // Ajouter les réactions si elles existent
    if (vaccination.reactions) {
      doc
        .fontSize(8)
        .text(`Réactions: ${vaccination.reactions}`, leftCol, y, { width: 450 });
      y += 15;
    }

    // Ajouter une ligne séparatrice
    if (index < vaccinations.length - 1) {
      doc
        .moveTo(50, y + 5)
        .lineTo(550, y + 5)
        .stroke();
      y += 15;
    }
  });
}

function addCertificateFooter(doc) {
  const footerY = 750;
  
  doc
    .fontSize(10)
    .text('Ce certificat est valable pour toute présentation administrative.', 50, footerY, { width: 500 })
    .text('Signature et cachet du médecin:', 50, footerY + 40)
    .moveTo(200, footerY + 55)
    .lineTo(400, footerY + 55)
    .stroke()
    .text('Date d\'émission: ' + new Date().toLocaleDateString('fr-FR'), 400, footerY + 60, { align: 'right' });
}

// Modification de la table consultations pour ajouter les nouveaux champs
const updateConsultationsTable = () => {
  // Ajouter les colonnes manquantes si elles n'existent pas
  const newColumns = [
    { name: 'symptomes', type: 'TEXT' },
    { name: 'traitement', type: 'TEXT' },
    { name: 'observations', type: 'TEXT' },
    { name: 'duree', type: 'INTEGER' },
    { name: 'prochainRdv', type: 'DATE' },
    { name: 'pouls', type: 'TEXT' },
    { name: 'frequenceRespiratoire', type: 'TEXT' },
    { name: 'updated_at', type: 'DATETIME DEFAULT CURRENT_TIMESTAMP' }
  ];
  
  newColumns.forEach(column => {
    db.run(`ALTER TABLE consultations ADD COLUMN ${column.name} ${column.type}`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error(`Erreur ajout colonne ${column.name}:`, err.message);
      }
    });
  });
};

// Appeler la fonction de mise à jour lors de l'initialisation
updateConsultationsTable();

// Initialisation de la base de données
const initDatabase = () => {
  createTables();
  
  // Vérifier si les données existent déjà
  db.get('SELECT COUNT(*) as count FROM patients', (err, row) => {
    if (err) {
      console.error('Erreur lors de la vérification:', err.message);
    } else if (row.count === 0) {
      console.log('Insertion des données de test...');
      insertTestData();
      insertTestUsers();
      console.log('Données de test insérées avec succès');
    } else {
      console.log('Les données existent déjà dans la base');
    }
  });
};

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  initDatabase();
});

// Fermeture propre de la base de données
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Erreur lors de la fermeture de la base:', err.message);
    } else {
      console.log('Base de données fermée');
    }
    process.exit(0);
  });
});

// Route d'inscription
app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, nom, prenom, email } = req.body;

  // Validation basique
  if (!username || !password || !role || !nom || !prenom) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }

  try {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertion de l'utilisateur
    db.run(`
      INSERT INTO users (username, password, role, nom, prenom, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, hashedPassword, role, nom, prenom, email], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
        }
        return res.status(500).json({ error: err.message });
      }

      const token = jwt.sign(
        { id: this.lastID, email, role }, 
        JWT_SECRET, 
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({ 
        message: 'Utilisateur créé avec succès',
        token,
        user: { id: this.lastID, email, role, nom, prenom }
      });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route de connexion
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    try {
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: 'Mot de passe incorrect' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom
        }
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

// Route de vérification du token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// GET - Récupérer tous les utilisateurs (sans les mots de passe)
app.get('/api/users', (req, res) => {
  db.all(`
    SELECT id, username, role, nom, prenom, email, created_at, updated_at 
    FROM users
  `, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});