// services/pouchService.js
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import PouchDBAdapterIdb from 'pouchdb-adapter-idb';
import bcryptjs from 'bcryptjs';

// Configuration pour Vite
if (typeof global === 'undefined') {
  globalThis.global = globalThis;
}

// Configuration des plugins PouchDB
PouchDB.plugin(PouchDBFind);
PouchDB.plugin(PouchDBAdapterIdb);

// Créer une instance de base de données avec la configuration adaptée
const createDatabase = (name, options = {}) => {
  return new PouchDB(name, {
    adapter: 'idb',
    auto_compaction: true,
    revs_limit: 10,
    ...options
  });
};

class PouchService {
  constructor() {
    this.db = null;
    this.localDB = createDatabase('medical_records');
    this.remoteDB = null;
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : false;
    this.syncHandler = null;
    this.changeListeners = [];
    this.backendURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
    this.isInitialized = false;
    this.initialSyncDone = false;
    this.authDB = createDatabase('auth_store');
    
    this.initializeDB();
    this.setupNetworkListener();
    this.setupAuthStore();
  }

  async initializeDB() {
    try {
      // Attendre un peu pour que PouchDB soit prêt
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Créer tous les index nécessaires
      await this.ensureIndexes();
      
      console.log('Base de données locale initialisée avec tous les index');
      
      // CORRECTION 1: Vérifier si la base locale est vide
      await this.checkAndLoadInitialData();
      
      this.isInitialized = true;
      
      // CORRECTION 2: Déclencher la synchronisation si en ligne
      if (this.isOnline) {
        console.log('Application en ligne - démarrage synchronisation initiale');
        await this.syncWithBackend();
      }
      
    } catch (error) {
      console.error('Erreur initialisation DB:', error);
      
      // Essayer de récupérer en recréant les index
      try {
        await this.checkAndRepairIndexes();
      } catch (repairError) {
        console.error('Impossible de réparer les index:', repairError);
      }
    }
  }

  // Méthodes utilitaires
  async getStats() {
    try {
      const allDocs = await this.localDB.allDocs({ include_docs: true });
      const patients = allDocs.rows.filter(row => row.doc.type === 'patient');
      const consultations = allDocs.rows.filter(row => row.doc.type === 'consultation');
      
      return {
        totalPatients: patients.length,
        totalConsultations: consultations.length,
        pendingSync: allDocs.rows.filter(row => row.doc.syncStatus === 'pending').length,
        isOnline: this.isOnline
      };
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      return {
        totalPatients: 0,
        totalConsultations: 0,
        pendingSync: 0,
        isOnline: this.isOnline
      };
    }
  }
  
async checkAndLoadInitialData() {
    try {
      // Vérifier si la base locale contient des données
      const stats = await this.getStats();
      console.log('Stats base locale:', stats);
      
      if (stats.totalPatients === 0 && stats.totalConsultations === 0) {
        console.log('Base locale vide - tentative de chargement depuis le backend');
        
        if (this.isOnline) {
          // Charger les données depuis le backend
          await this.loadInitialDataFromBackend();
        } else {
          console.log('Hors ligne - impossible de charger les données initiales');
        }
      } else {
        console.log(`Base locale contient ${stats.totalPatients} patients et ${stats.totalConsultations} consultations`);
      }
    } catch (error) {
      console.error('Erreur vérification données initiales:', error);
    }
  }

  // NOUVELLE MÉTHODE: Charger les données initiales depuis le backend
  async loadInitialDataFromBackend() {
    try {
      console.log('Chargement des données initiales depuis le backend...');
      
      // Charger les patients
      const patientsResponse = await fetch(`${this.backendURL}/api/patients`);
      if (patientsResponse.ok) {
        const backendPatients = await patientsResponse.json();
        console.log(`Trouvé ${backendPatients.length} patients sur le backend`);
        
        for (const backendPatient of backendPatients) {
          try {
            // Créer le patient localement
            await this.localDB.put({
              _id: this.generateId('patient'),
              type: 'patient',
              backendId: backendPatient.id,
              nom: backendPatient.nom,
              prenom: backendPatient.prenom,
              dateNaissance: backendPatient.dateNaissance,
              sexe: backendPatient.sexe,
              telephone: backendPatient.telephone,
              adresse: backendPatient.adresse,
              profession: backendPatient.profession,
              situationMatrimoniale: backendPatient.situationMatrimoniale,
              contactUrgence: backendPatient.contactUrgence,
              numeroPatient: backendPatient.numeroPatient,
              dateEnregistrement: backendPatient.dateEnregistrement || backendPatient.created_at,
              lastVisit: backendPatient.lastVisit,
              consultations: backendPatient.consultations,
              syncStatus: 'synced',
              createdAt: backendPatient.created_at,
              updatedAt: backendPatient.updated_at
            });
            console.log(`Patient ${backendPatient.nom} ${backendPatient.prenom} importé`);
          } catch (error) {
            console.error('Erreur import patient:', backendPatient, error);
          }
        }
      }

      // Charger les consultations
      const consultationsResponse = await fetch(`${this.backendURL}/api/consultations`);
      if (consultationsResponse.ok) {
        const backendConsultations = await consultationsResponse.json();
        console.log(`Trouvé ${backendConsultations.length} consultations sur le backend`);
        
        for (const backendConsultation of backendConsultations) {
          try {
            // Trouver le patient local correspondant
            const localPatient = await this.localDB.find({
              selector: { 
                type: 'patient', 
                backendId: backendConsultation.patientId 
              }
            });

            if (localPatient.docs.length > 0) {
              // Créer la consultation localement
              await this.localDB.put({
                _id: this.generateId('consultation'),
                type: 'consultation',
                backendId: backendConsultation.id,
                patientId: localPatient.docs[0]._id,
                dateConsultation: backendConsultation.date,
                motif: backendConsultation.motif,
                symptomes: backendConsultation.symptomes,
                diagnostic: backendConsultation.diagnostic,
                traitement: backendConsultation.traitement,
                observations: backendConsultation.observations,
                duree: backendConsultation.duree,
                prochainRdv: backendConsultation.prochainRdv,
                medecin: backendConsultation.medecin,
                status: backendConsultation.status,
                poids: backendConsultation.poids,
                taille: backendConsultation.taille,
                tension: backendConsultation.tension,
                temperature: backendConsultation.temperature,
                pouls: backendConsultation.pouls,
                frequenceRespiratoire: backendConsultation.frequenceRespiratoire,
                syncStatus: 'synced',
                createdAt: backendConsultation.created_at,
                updatedAt: backendConsultation.updated_at
              });
              console.log(`Consultation du ${backendConsultation.date} importée`);
            } else {
              console.warn(`Patient non trouvé pour consultation ${backendConsultation.id}`);
            }
          } catch (error) {
            console.error('Erreur import consultation:', backendConsultation, error);
          }
        }
      }

      this.initialSyncDone = true;
      console.log('Chargement initial terminé');
      
      // Notifier les composants
      this.notifyListeners({ type: 'initial_load_complete' });
      
    } catch (error) {
      console.error('Erreur chargement initial:', error);
    }
  }

async checkAndRepairIndexes() {
  try {
    // Vérifier les index existants
    const indexes = await this.localDB.getIndexes();
    console.log('Index existants:', indexes);
    
    // Recréer les index manquants
    await this.ensureIndexes();
    
    return true;
  } catch (error) {
    console.error('Erreur vérification index:', error);
    return false;
  }
}


  setupNetworkListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', async () => {
        this.isOnline = true;
        console.log('Application en ligne - synchronisation avec le backend');
        
        // Si c'est le premier passage en ligne et qu'on n'a pas encore fait le sync initial
        if (!this.initialSyncDone) {
          await this.checkAndLoadInitialData();
        }
        
        await this.syncWithBackend();
        this.notifyListeners({ type: 'online' });
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        console.log('Application hors ligne');
        this.notifyListeners({ type: 'offline' });
      });
    }
  }

  // Synchronisation avec le backend Express
  async syncWithBackend() {
    if (!this.isOnline) {
      console.log('Pas en ligne - synchronisation annulée');
      return;
    }

    try {
      console.log('Début de la synchronisation avec le backend...');
      this.notifyListeners({ type: 'sync_active' });
      
      // Synchroniser les patients
      await this.syncPatients();
      
      // Synchroniser les consultations
      await this.syncConsultations();
      
      // Synchroniser les antécédents
      await this.syncAntecedents();
      
      // Synchroniser les vaccinations
      await this.syncVaccinations();
      
      // Synchroniser les notes
      await this.syncNotes();
      
      // Synchroniser les utilisateurs
      await this.syncUsers();
      
      this.notifyListeners({ type: 'sync_complete' });
      console.log('Synchronisation terminée avec succès');
      
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      this.notifyListeners({ type: 'sync_error', error });
    }
  }

  async forceReloadFromBackend() {
    try {
      console.log('Rechargement forcé depuis le backend...');
      
      // Vider la base locale (optionnel - ou on peut juste marquer comme non-synced)
      await this.clearDB();
      
      // Recharger depuis le backend
      await this.loadInitialDataFromBackend();
      
      console.log('Rechargement forcé terminé');
      return true;
    } catch (error) {
      console.error('Erreur rechargement forcé:', error);
      return false;
    }
  }

  // NOUVELLE MÉTHODE: Vérifier la connectivité backend
  async checkBackendConnectivity() {
    try {
      const response = await fetch(`${this.backendURL}/api/health`, {
        method: 'GET',
        timeout: 5000
      });
      return response.ok;
    } catch (error) {
      console.error('Backend non accessible:', error);
      return false;
    }
  }

  // MÉTHODE UTILITAIRE: Obtenir le statut de synchronisation
  getSyncStatus() {
    return {
      isOnline: this.isOnline,
      isInitialized: this.isInitialized,
      initialSyncDone: this.initialSyncDone,
      backendURL: this.backendURL
    };
  }

  async syncPatients() {
    try {
      // Récupérer les patients en attente de sync
      const pendingPatients = await this.localDB.find({
        selector: { 
          type: 'patient', 
          syncStatus: 'pending' 
        }
      });

      // Envoyer les nouveaux patients vers le backend
      for (const patient of pendingPatients.docs) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nom: patient.nom,
              prenom: patient.prenom,
              dateNaissance: patient.dateNaissance,
              sexe: patient.sexe,
              telephone: patient.telephone,
              adresse: patient.adresse,
              profession: patient.profession,
              situationMatrimoniale: patient.situationMatrimoniale,
              contactUrgence: patient.contactUrgence,
              numeroPatient: patient.numeroPatient
            })
          });

          if (response.ok) {
            const result = await response.json();
            // Mettre à jour le patient local avec l'ID du backend
            await this.localDB.put({
              ...patient,
              backendId: result.id,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Erreur sync patient:', error);
        }
      }

      // Récupérer les patients depuis le backend
      const response = await fetch(`${this.backendURL}/api/patients`);
      if (response.ok) {
        const backendPatients = await response.json();
        
        for (const backendPatient of backendPatients) {
          try {
            // Vérifier si le patient existe déjà localement
            const existingPatient = await this.localDB.find({
              selector: { 
                type: 'patient', 
                $or: [
                  { backendId: backendPatient.id },
                  { numeroPatient: backendPatient.numeroPatient }
                ]
              }
            });

            if (existingPatient.docs.length === 0) {
              // Créer le patient localement
              await this.localDB.put({
                _id: this.generateId('patient'),
                type: 'patient',
                backendId: backendPatient.id,
                nom: backendPatient.nom,
                prenom: backendPatient.prenom,
                dateNaissance: backendPatient.dateNaissance,
                sexe: backendPatient.sexe,
                telephone: backendPatient.telephone,
                adresse: backendPatient.adresse,
                profession: backendPatient.profession,
                situationMatrimoniale: backendPatient.situationMatrimoniale,
                contactUrgence: backendPatient.contactUrgence,
                numeroPatient: backendPatient.numeroPatient,
                dateEnregistrement: backendPatient.dateEnregistrement,
                lastVisit: backendPatient.lastVisit,
                consultations: backendPatient.consultations,
                syncStatus: 'synced',
                createdAt: backendPatient.created_at,
                updatedAt: backendPatient.updated_at
              });
            }
          } catch (error) {
            console.error('Erreur import patient:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur synchronisation patients:', error);
    }
  }

  async syncConsultations() {
    try {
      // Récupérer les consultations en attente de sync
      const pendingConsultations = await this.localDB.find({
        selector: { 
          type: 'consultation', 
          syncStatus: 'pending' 
        }
      });

      // Envoyer les nouvelles consultations vers le backend
      for (const consultation of pendingConsultations.docs) {
        try {
          // Récupérer l'ID backend du patient
          const patient = await this.localDB.get(consultation.patientId);
          if (!patient.backendId) continue;

          const response = await fetch(`${this.backendURL}/api/consultations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patientId: patient.backendId,
              date: consultation.dateConsultation,
              motif: consultation.motif,
              symptomes: consultation.symptomes,
              diagnostic: consultation.diagnostic,
              traitement: consultation.traitement,
              observations: consultation.observations,
              duree: consultation.duree,
              prochainRdv: consultation.prochainRdv,
              medecin: consultation.medecin,
              status: consultation.status,
              poids: consultation.poids,
              taille: consultation.taille,
              tension: consultation.tension,
              temperature: consultation.temperature,
              pouls: consultation.pouls,
              frequenceRespiratoire: consultation.frequenceRespiratoire
            })
          });

          if (response.ok) {
            const result = await response.json();
            // Mettre à jour la consultation locale
            await this.localDB.put({
              ...consultation,
              backendId: result.id,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Erreur sync consultation:', error);
        }
      }

      // Récupérer les consultations depuis le backend
      const response = await fetch(`${this.backendURL}/api/consultations`);
      if (response.ok) {
        const backendConsultations = await response.json();
        
        for (const backendConsultation of backendConsultations) {
          try {
            // Trouver le patient local correspondant
            const localPatient = await this.localDB.find({
              selector: { 
                type: 'patient', 
                backendId: backendConsultation.patientId 
              }
            });

            if (localPatient.docs.length === 0) continue;

            // Vérifier si la consultation existe déjà localement
            const existingConsultation = await this.localDB.find({
              selector: { 
                type: 'consultation', 
                backendId: backendConsultation.id 
              }
            });

            if (existingConsultation.docs.length === 0) {
              // Créer la consultation localement
              await this.localDB.put({
                _id: this.generateId('consultation'),
                type: 'consultation',
                backendId: backendConsultation.id,
                patientId: localPatient.docs[0]._id,
                dateConsultation: backendConsultation.date,
                motif: backendConsultation.motif,
                symptomes: backendConsultation.symptomes,
                diagnostic: backendConsultation.diagnostic,
                traitement: backendConsultation.traitement,
                observations: backendConsultation.observations,
                duree: backendConsultation.duree,
                prochainRdv: backendConsultation.prochainRdv,
                medecin: backendConsultation.medecin,
                status: backendConsultation.status,
                poids: backendConsultation.poids,
                taille: backendConsultation.taille,
                tension: backendConsultation.tension,
                temperature: backendConsultation.temperature,
                pouls: backendConsultation.pouls,
                frequenceRespiratoire: backendConsultation.frequenceRespiratoire,
                syncStatus: 'synced',
                createdAt: backendConsultation.created_at,
                updatedAt: backendConsultation.updated_at
              });
            }
          } catch (error) {
            console.error('Erreur import consultation:', error);
          }
        }
      }
    } catch (error) {
      console.error('Erreur synchronisation consultations:', error);
    }
  }

  async syncAntecedents() {
    try {
      // Récupérer les antécédents en attente de sync
      const pendingAntecedents = await this.localDB.find({
        selector: { 
          type: 'antecedent', 
          syncStatus: 'pending' 
        }
      });

      // Envoyer les nouveaux antécédents vers le backend
      for (const antecedent of pendingAntecedents.docs) {
        try {
          // Récupérer l'ID backend du patient
          const patient = await this.localDB.get(antecedent.patientId);
          if (!patient.backendId) continue;

          const response = await fetch(`${this.backendURL}/api/patients/${patient.backendId}/antecedents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: antecedent.type,
              description: antecedent.description,
              date: antecedent.date
            })
          });

          if (response.ok) {
            const result = await response.json();
            // Mettre à jour l'antécédent local
            await this.localDB.put({
              ...antecedent,
              backendId: result.id,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Erreur sync antécédent:', error);
        }
      }

      // Récupérer les antécédents depuis le backend
      const patients = await this.localDB.find({
        selector: { type: 'patient', backendId: { $exists: true } }
      });

      for (const patient of patients.docs) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${patient.backendId}/antecedents`);
          if (response.ok) {
            const backendAntecedents = await response.json();
            
            for (const backendAntecedent of backendAntecedents) {
              // Vérifier si l'antécédent existe déjà localement
              const existingAntecedent = await this.localDB.find({
                selector: { 
                  type: 'antecedent', 
                  backendId: backendAntecedent.id 
                }
              });

              if (existingAntecedent.docs.length === 0) {
                // Créer l'antécédent localement
                await this.localDB.put({
                  _id: this.generateId('antecedent'),
                  type: 'antecedent',
                  backendId: backendAntecedent.id,
                  patientId: patient._id,
                  description: backendAntecedent.description,
                  type: backendAntecedent.type,
                  date: backendAntecedent.date,
                  syncStatus: 'synced',
                  createdAt: backendAntecedent.created_at,
                  updatedAt: backendAntecedent.updated_at
                });
              }
            }
          }
        } catch (error) {
          console.error('Erreur récupération antécédents backend:', error);
        }
      }
    } catch (error) {
      console.error('Erreur synchronisation antécédents:', error);
    }
  }

  async syncVaccinations() {
    try {
      // Récupérer les vaccinations en attente de sync
      const pendingVaccinations = await this.localDB.find({
        selector: { 
          type: 'vaccination', 
          syncStatus: 'pending' 
        }
      });

      // Envoyer les nouvelles vaccinations vers le backend
      for (const vaccination of pendingVaccinations.docs) {
        try {
          // Récupérer l'ID backend du patient
          const patient = await this.localDB.get(vaccination.patientId);
          if (!patient.backendId) continue;

          const response = await fetch(`${this.backendURL}/api/patients/${patient.backendId}/vaccinations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              vaccin: vaccination.vaccin,
              lot: vaccination.lot,
              dateAdministration: vaccination.dateAdministration,
              prochainRappel: vaccination.prochainRappel,
              administrePar: vaccination.administrePar,
              reactions: vaccination.reactions
            })
          });

          if (response.ok) {
            const result = await response.json();
            // Mettre à jour la vaccination locale
            await this.localDB.put({
              ...vaccination,
              backendId: result.id,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Erreur sync vaccination:', error);
        }
      }

      // Récupérer les vaccinations depuis le backend
      const patients = await this.localDB.find({
        selector: { type: 'patient', backendId: { $exists: true } }
      });

      for (const patient of patients.docs) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${patient.backendId}/vaccinations`);
          if (response.ok) {
            const backendVaccinations = await response.json();
            
            for (const backendVaccination of backendVaccinations) {
              // Vérifier si la vaccination existe déjà localement
              const existingVaccination = await this.localDB.find({
                selector: { 
                  type: 'vaccination', 
                  backendId: backendVaccination.id 
                }
              });

              if (existingVaccination.docs.length === 0) {
                // Créer la vaccination localement
                await this.localDB.put({
                  _id: this.generateId('vaccination'),
                  type: 'vaccination',
                  backendId: backendVaccination.id,
                  patientId: patient._id,
                  vaccin: backendVaccination.vaccin,
                  lot: backendVaccination.lot,
                  dateAdministration: backendVaccination.dateAdministration,
                  prochainRappel: backendVaccination.prochainRappel,
                  administrePar: backendVaccination.administrePar,
                  reactions: backendVaccination.reactions,
                  status: backendVaccination.status,
                  syncStatus: 'synced',
                  createdAt: backendVaccination.created_at,
                  updatedAt: backendVaccination.updated_at
                });
              }
            }
          }
        } catch (error) {
          console.error('Erreur récupération vaccinations backend:', error);
        }
      }
    } catch (error) {
      console.error('Erreur synchronisation vaccinations:', error);
    }
  }

  async syncNotes() {
    try {
      // Récupérer les notes en attente de sync
      const pendingNotes = await this.localDB.find({
        selector: { 
          type: 'note', 
          syncStatus: 'pending' 
        }
      });

      // Envoyer les nouvelles notes vers le backend
      for (const note of pendingNotes.docs) {
        try {
          // Récupérer l'ID backend du patient
          const patient = await this.localDB.get(note.patientId);
          if (!patient.backendId) continue;

          const response = await fetch(`${this.backendURL}/api/patients/${patient.backendId}/notes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: note.date,
              auteur: note.auteur,
              contenu: note.contenu
            })
          });

          if (response.ok) {
            const result = await response.json();
            // Mettre à jour la note locale
            await this.localDB.put({
              ...note,
              backendId: result.id,
              syncStatus: 'synced',
              updatedAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Erreur sync note:', error);
        }
      }

      // Récupérer les notes depuis le backend
      const patients = await this.localDB.find({
        selector: { type: 'patient', backendId: { $exists: true } }
      });

      for (const patient of patients.docs) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${patient.backendId}/notes`);
          if (response.ok) {
            const backendNotes = await response.json();
            
            for (const backendNote of backendNotes) {
              // Vérifier si la note existe déjà localement
              const existingNote = await this.localDB.find({
                selector: { 
                  type: 'note', 
                  backendId: backendNote.id 
                }
              });

              if (existingNote.docs.length === 0) {
                // Créer la note localement
                await this.localDB.put({
                  _id: this.generateId('note'),
                  type: 'note',
                  backendId: backendNote.id,
                  patientId: patient._id,
                  date: backendNote.date,
                  auteur: backendNote.auteur,
                  contenu: backendNote.contenu,
                  syncStatus: 'synced',
                  createdAt: backendNote.created_at,
                  updatedAt: backendNote.updated_at
                });
              }
            }
          }
        } catch (error) {
          console.error('Erreur récupération notes backend:', error);
        }
      }
    } catch (error) {
      console.error('Erreur synchronisation notes:', error);
    }
  }

  async syncUsers() {
    try {
      if (!this.isOnline) return;

      console.log('Synchronisation des utilisateurs...');
      
      const response = await fetch(`${this.backendURL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Erreur récupération utilisateurs');
      }

      const backendUsers = await response.json();
      console.log(`${backendUsers.length} utilisateurs trouvés sur le backend`);

      for (const user of backendUsers) {
        try {
          // Vérifier si l'utilisateur existe déjà localement
          const existingUser = await this.localDB.find({
            selector: {
              type: 'user',
              email: user.email
            }
          });

          if (existingUser.docs.length === 0) {
            // Créer l'utilisateur localement
            await this.localDB.put({
              _id: `user_${user.id}`,
              type: 'user',
              backendId: user.id,
              email: user.email,
              nom: user.nom,
              prenom: user.prenom,
              role: user.role,
              username: user.username,
              syncStatus: 'synced',
              createdAt: user.created_at,
              updatedAt: user.updated_at
            });
            console.log(`Utilisateur ${user.email} importé`);
          }
        } catch (error) {
          console.error('Erreur import utilisateur:', user, error);
        }
      }
    } catch (error) {
      console.error('Erreur synchronisation utilisateurs:', error);
    }
  }
  // Système d'événements pour notifier les composants React
  addChangeListener(callback) {
    this.changeListeners.push(callback);
    return () => {
      this.changeListeners = this.changeListeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(event) {
    this.changeListeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Erreur callback listener:', error);
      }
    });
  }

  // Génération d'ID unique optimisée
  generateId(type) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  // CRUD Operations pour les patients
  async createPatient(patientData) {
    try {
      const patientDoc = {
        _id: this.generateId('patient'),
        type: 'patient',
        ...patientData,
        dateEnregistrement: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      // Sauvegarder localement
      const result = await this.localDB.put(patientDoc);
      const newPatient = { ...patientDoc, _rev: result.rev };
      
      // Tenter de synchroniser immédiatement si en ligne
      if (this.isOnline) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nom: patientData.nom,
              prenom: patientData.prenom,
              dateNaissance: patientData.dateNaissance,
              sexe: patientData.sexe,
              telephone: patientData.telephone,
              adresse: patientData.adresse,
              profession: patientData.profession,
              situationMatrimoniale: patientData.situationMatrimoniale,
              contactUrgence: patientData.contactUrgence,
              numeroPatient: patientData.numeroPatient
            })
          });

          if (response.ok) {
            const backendResult = await response.json();
            // Mettre à jour avec l'ID du backend
            const updatedPatient = {
              ...newPatient,
              backendId: backendResult.id,
              syncStatus: 'synced'
            };
            await this.localDB.put(updatedPatient);
            newPatient.backendId = backendResult.id;
            newPatient.syncStatus = 'synced';
          }
        } catch (error) {
          console.error('Erreur sync immédiate patient:', error);
        }
      }

      console.log('Patient créé:', result);
      this.notifyListeners({ 
        type: 'patient_created', 
        patient: newPatient 
      });
      
      return newPatient;
    } catch (error) {
      console.error('Erreur création patient:', error);
      throw error;
    }
  }

  async updatePatient(patientData) {
    try {
      const updatedDoc = {
        ...patientData,
        updatedAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      // Sauvegarder localement
      const result = await this.localDB.put(updatedDoc);
      const updatedPatient = { ...updatedDoc, _rev: result.rev };
      
      // Tenter de synchroniser immédiatement si en ligne
      if (this.isOnline && updatedDoc.backendId) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${updatedDoc.backendId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              nom: updatedDoc.nom,
              prenom: updatedDoc.prenom,
              dateNaissance: updatedDoc.dateNaissance,
              sexe: updatedDoc.sexe,
              telephone: updatedDoc.telephone,
              adresse: updatedDoc.adresse,
              profession: updatedDoc.profession,
              situationMatrimoniale: updatedDoc.situationMatrimoniale,
              contactUrgence: updatedDoc.contactUrgence,
              status: updatedDoc.status || 'synced'
            })
          });

          if (response.ok) {
            updatedPatient.syncStatus = 'synced';
            await this.localDB.put(updatedPatient);
          }
        } catch (error) {
          console.error('Erreur sync immédiate patient:', error);
        }
      }

      console.log('Patient mis à jour:', result);
      this.notifyListeners({ 
        type: 'patient_updated', 
        patient: updatedPatient 
      });
      
      return updatedPatient;
    } catch (error) {
      console.error('Erreur mise à jour patient:', error);
      throw error;
    }
  }

  async deletePatient(patientId, rev) {
    try {
      // Récupérer le patient avant suppression
      const patient = await this.localDB.get(patientId);
      
      // Supprimer localement
      const result = await this.localDB.remove(patientId, rev);
      
      // Tenter de supprimer du backend si en ligne
      if (this.isOnline && patient.backendId) {
        try {
          await fetch(`${this.backendURL}/api/patients/${patient.backendId}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.error('Erreur suppression backend patient:', error);
        }
      }

      console.log('Patient supprimé:', result);
      this.notifyListeners({ 
        type: 'patient_deleted', 
        patientId 
      });
      
      return result;
    } catch (error) {
      console.error('Erreur suppression patient:', error);
      throw error;
    }
  }

  async getPatient(patientId) {
    try {
      const doc = await this.localDB.get(patientId);
      return doc;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAllPatients() {
  try {
    console.log('[PouchService] Tentative de récupération des patients...');
    
    // Première tentative avec tri sur createdAt
    try {
      const result = await this.localDB.find({
        selector: { type: 'patient' },
        sort: [{ type: 'asc' }, { createdAt: 'desc' }]
      });
      
      console.log('[PouchService] Résultat avec tri createdAt:', result);
      
      const patients = result.docs.map(patient => ({
        ...patient,
        id: patient._id,
        status: this.getDocumentStatus(patient)
      }));
      
      console.log('[PouchService] Patients transformés:', patients);
      return patients;
      
    } catch (sortError) {
      console.log('[PouchService] Erreur tri createdAt, tentative avec dateEnregistrement:', sortError.message);
      
      // Deuxième tentative avec tri sur dateEnregistrement
      try {
        const result = await this.localDB.find({
          selector: { type: 'patient' },
          sort: [{ type: 'asc' }, { dateEnregistrement: 'desc' }]
        });
        
        console.log('[PouchService] Résultat avec tri dateEnregistrement:', result);
        
        const patients = result.docs.map(patient => ({
          ...patient,
          id: patient._id,
          status: this.getDocumentStatus(patient)
        }));
        
        console.log('[PouchService] Patients transformés:', patients);
        return patients;
        
      } catch (sortError2) {
        console.log('[PouchService] Erreur tri dateEnregistrement, récupération sans tri:', sortError2.message);
        
        // Troisième tentative sans tri
        const result = await this.localDB.find({
          selector: { type: 'patient' }
        });
        
        console.log('[PouchService] Résultat sans tri:', result);
        
        // Trier manuellement par date (plus récent en premier)
        const patients = result.docs
          .map(patient => ({
            ...patient,
            id: patient._id,
            status: this.getDocumentStatus(patient)
          }))
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || a.dateEnregistrement || 0);
            const dateB = new Date(b.createdAt || b.dateEnregistrement || 0);
            return dateB - dateA; // Plus récent en premier
          });
        
        console.log('[PouchService] Patients triés manuellement:', patients);
        return patients;
      }
    }
    
  } catch (error) {
    console.error('[PouchService] Erreur getAllPatients:', error);
    throw error;
  }
}

async ensureIndexes() {
  try {
    const indexes = [
      // Existing indexes
      { 
        index: {
          fields: ['type', 'nom', 'prenom', 'numeroPatient'],
          name: 'patient_search_index'
        }
      },
      { 
        index: {
          fields: ['type', 'patientId', 'dateConsultation'],
          name: 'consultation_index'
        }
      },
      // Add specific index for vaccinations
      { 
        index: {
          fields: ['type', 'patientId'],
          name: 'vaccination_by_patient_index'
        }
      },
      // Add specific index for antecedents
      { 
        index: {
          fields: ['type', 'patientId', 'date'],
          name: 'antecedent_by_patient_index'
        }
      },
      // Add specific index for notes
      { 
        index: {
          fields: ['type', 'patientId', 'date'],
          name: 'note_by_patient_index'
        }
      },
      { 
        index: {
          fields: ['type', 'email'],
          name: 'users_by_email_index'
        }
      }
    ];

    // Create the indexes
    for (const indexDef of indexes) {
      await this.localDB.createIndex(indexDef);
    }

    console.log('Indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}


  async searchPatients(searchTerm) {
  try {
    if (!searchTerm || searchTerm.trim() === '') {
      return await this.getAllPatients();
    }

    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    try {
      // Première tentative avec regex (peut ne pas marcher sur tous les adaptateurs)
      const result = await this.localDB.find({
        selector: {
          type: 'patient',
          $or: [
            { nom: { $regex: new RegExp(escapedTerm, 'i') } },
            { prenom: { $regex: new RegExp(escapedTerm, 'i') } },
            { telephone: { $regex: new RegExp(escapedTerm, 'i') } },
            { numeroPatient: { $regex: new RegExp(escapedTerm, 'i') } }
          ]
        }
      });
      
      return result.docs.map(patient => ({
        ...patient,
        id: patient._id,
        status: this.getDocumentStatus(patient)
      }));
      
    } catch (regexError) {
      console.log('Regex non supportée, recherche manuelle:', regexError.message);
      
      // Recherche manuelle si regex non supportée
      const allPatients = await this.getAllPatients();
      const searchLower = searchTerm.toLowerCase();
      
      return allPatients.filter(patient => 
        (patient.nom && patient.nom.toLowerCase().includes(searchLower)) ||
        (patient.prenom && patient.prenom.toLowerCase().includes(searchLower)) ||
        (patient.telephone && patient.telephone.includes(searchTerm)) ||
        (patient.numeroPatient && patient.numeroPatient.toLowerCase().includes(searchLower))
      );
    }
  } catch (error) {
    console.error('Erreur recherche patients:', error);
    throw error;
  }
}


  getDocumentStatus(doc) {
      if (!this.isOnline) return 'offline';
      if (doc.syncStatus === 'pending') return 'pending';
      return 'synced';
    }
  // Méthodes pour les consultations
  async createConsultation(consultationData) {
    try {
      const consultationDoc = {
        _id: this.generateId('consultation'),
        type: 'consultation',
        ...consultationData,
        dateConsultation: consultationData.dateConsultation || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      // Sauvegarder localement
      const result = await this.localDB.put(consultationDoc);
      const newConsultation = { ...consultationDoc, _rev: result.rev };
      
      // Tenter de synchroniser immédiatement si en ligne
      if (this.isOnline) {
        try {
          // Récupérer le patient pour obtenir son ID backend
          const patient = await this.localDB.get(consultationData.patientId);
          if (patient.backendId) {
            const response = await fetch(`${this.backendURL}/api/consultations`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                patientId: patient.backendId,
                date: consultationData.dateConsultation,
                motif: consultationData.motif,
                symptomes: consultationData.symptomes,
                diagnostic: consultationData.diagnostic,
                traitement: consultationData.traitement,
                observations: consultationData.observations,
                duree: consultationData.duree,
                prochainRdv: consultationData.prochainRdv,
                medecin: consultationData.medecin,
                status: consultationData.status,
                poids: consultationData.poids,
                taille: consultationData.taille,
                tension: consultationData.tension,
                temperature: consultationData.temperature,
                pouls: consultationData.pouls,
                frequenceRespiratoire: consultationData.frequenceRespiratoire
              })
            });

            if (response.ok) {
              const backendResult = await response.json();
              // Mettre à jour avec l'ID du backend
              const updatedConsultation = {
                ...newConsultation,
                backendId: backendResult.id,
                syncStatus: 'synced'
              };
              await this.localDB.put(updatedConsultation);
              newConsultation.backendId = backendResult.id;
              newConsultation.syncStatus = 'synced';
            }
          }
        } catch (error) {
          console.error('Erreur sync immédiate consultation:', error);
        }
      }
      
      this.notifyListeners({ 
        type: 'consultation_created', 
        consultation: newConsultation 
      });
      
      return newConsultation;
    } catch (error) {
      console.error('Erreur création consultation:', error);
      throw error;
    }
  }

  async updateConsultation(consultationData) {
    try {
      const updatedDoc = {
        ...consultationData,
        updatedAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      // Sauvegarder localement
      const result = await this.localDB.put(updatedDoc);
      const updatedConsultation = { ...updatedDoc, _rev: result.rev };
      
      // Tenter de synchroniser immédiatement si en ligne
      if (this.isOnline && updatedDoc.backendId) {
        try {
          const response = await fetch(`${this.backendURL}/api/consultations/${updatedDoc.backendId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              date: updatedDoc.dateConsultation,
              motif: updatedDoc.motif,
              symptomes: updatedDoc.symptomes,
              diagnostic: updatedDoc.diagnostic,
              traitement: updatedDoc.traitement,
              observations: updatedDoc.observations,
              duree: updatedDoc.duree,
              prochainRdv: updatedDoc.prochainRdv,
              medecin: updatedDoc.medecin,
              status: updatedDoc.status,
              poids: updatedDoc.poids,
              taille: updatedDoc.taille,
              tension: updatedDoc.tension,
              temperature: updatedDoc.temperature,
              pouls: updatedDoc.pouls,
              frequenceRespiratoire: updatedDoc.frequenceRespiratoire
            })
          });

          if (response.ok) {
            updatedConsultation.syncStatus = 'synced';
            await this.localDB.put(updatedConsultation);
          }
        } catch (error) {
          console.error('Erreur sync immédiate consultation:', error);
        }
      }
      
      this.notifyListeners({ 
        type: 'consultation_updated', 
        consultation: updatedConsultation 
      });
      
      return updatedConsultation;
    } catch (error) {
      console.error('Erreur mise à jour consultation:', error);
      throw error;
    }
  }

  async deleteConsultation(consultationId, rev) {
    try {
      // Récupérer la consultation avant suppression
      const consultation = await this.localDB.get(consultationId);
      
      // Supprimer localement
      const result = await this.localDB.remove(consultationId, rev);
      
      // Tenter de supprimer du backend si en ligne
      if (this.isOnline && consultation.backendId) {
        try {
          await fetch(`${this.backendURL}/api/consultations/${consultation.backendId}`, {
            method: 'DELETE'
          });
        } catch (error) {
          console.error('Erreur suppression backend consultation:', error);
        }
      }
      
      this.notifyListeners({ 
        type: 'consultation_deleted', 
        consultationId 
      });
      
      return result;
    } catch (error) {
      console.error('Erreur suppression consultation:', error);
      throw error;
    }
  }

  async getConsultationsByPatient(patientId) {
    try {
      console.log('Début getConsultationsByPatient pour', patientId);
      const result = await this.localDB.find({
        selector: { 
          type: 'consultation',
          patientId: patientId 
        }
      });
      console.log('Résultat brut consultations:', result);
      
      // Manual sorting since we can't use sort without an index
      const consultations = result.docs.sort((a, b) => {
        return new Date(b.dateConsultation || b.date || 0) - new Date(a.dateConsultation || a.date || 0);
      });
      console.log('Consultations triées:', consultations);
      
      const formattedConsultations = consultations.map(consultation => ({
        ...consultation,
        id: consultation._id,
        status: this.getDocumentStatus(consultation)
      }));
      console.log('Consultations formatées:', formattedConsultations);
      
      return formattedConsultations;
    } catch (error) {
      console.error('Erreur récupération consultations:', error);
      throw error;
    }
  }

  // Méthodes pour les antécédents
  async getAntecedentsByPatient(patientId) {
    try {
      console.log('Début getAntecedentsByPatient pour', patientId);
      const result = await this.localDB.find({
        selector: {
          type: 'antecedent',
          patientId: patientId
        }
      });
      console.log('Résultat brut antécédents:', result);

      // Manual sorting since we can't use sort without an index
      const antecedents = result.docs.sort((a, b) => {
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
      console.log('antecedents fonction:', antecedents);

      const formattedAntecedents = antecedents.map(antecedent => ({
        ...antecedent,
        id: antecedent._id,
        status: this.getDocumentStatus(antecedent)
      }));
      console.log('Antécédents formatés:', formattedAntecedents);

      return formattedAntecedents;
    } catch (error) {
      console.error('Erreur récupération antécédents:', error);
      throw error;
    }
  }

  async createAntecedent(antecedentData) {
    try {
      const antecedentDoc = {
        _id: this.generateId('antecedent'),
        type: 'antecedent',
        ...antecedentData,
        createdAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      const result = await this.localDB.put(antecedentDoc);
      const newAntecedent = { ...antecedentDoc, _rev: result.rev };

      if (this.isOnline) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${antecedentData.patientId}/antecedents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: antecedentData.type,
              description: antecedentData.description,
              date: antecedentData.date
            })
          });

          if (response.ok) {
            const backendResult = await response.json();
            const updatedAntecedent = {
              ...newAntecedent,
              backendId: backendResult.id,
              syncStatus: 'synced'
            };
            await this.localDB.put(updatedAntecedent);
            return updatedAntecedent;
          }
        } catch (error) {
          console.error('Erreur sync antécédent:', error);
        }
      }

      return newAntecedent;
    } catch (error) {
      console.error('Erreur création antécédent:', error);
      throw error;
    }
  }

  // Méthodes pour les vaccinations
async getVaccinationsByPatient(patientId) {
  try {
    console.log('Début getVaccinationsByPatient pour', patientId);
    const result = await this.localDB.find({
      selector: {
        type: 'vaccination',
        patientId: patientId
      }
    });
    console.log('Résultat brut vaccinations:', result);

    // Manual sorting since we can't use sort without an index
    const vaccinations = result.docs.sort((a, b) => {
      return new Date(b.dateAdministration || 0) - new Date(a.dateAdministration || 0);
    });
    console.log('Vaccinations triées:', vaccinations);

    const formattedVaccinations = vaccinations.map(vaccination => ({
      ...vaccination,
      id: vaccination._id,
      status: this.getDocumentStatus(vaccination)
    }));
    console.log('Vaccinations formatées:', formattedVaccinations);

    return formattedVaccinations;
  } catch (error) {
    console.error('Error retrieving vaccinations:', error);
    
    // Fallback query without using index
    try {
      const result = await this.localDB.find({
        selector: {
          type: 'vaccination',
          patientId: patientId
        }
      });
      
      const vaccinations = result.docs.sort((a, b) => {
        return new Date(b.dateAdministration || 0) - new Date(a.dateAdministration || 0);
      });

      return vaccinations.map(vaccination => ({
        ...vaccination,
        id: vaccination._id,
        status: this.getDocumentStatus(vaccination)
      }));
    } catch (fallbackError) {
      console.error('Fallback query failed:', fallbackError);
      throw fallbackError;
    }
  }
}

  async createVaccination(vaccinationData) {
    try {
      const vaccinationDoc = {
        _id: this.generateId('vaccination'),
        type: 'vaccination',
        ...vaccinationData,
        createdAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      const result = await this.localDB.put(vaccinationDoc);
      const newVaccination = { ...vaccinationDoc, _rev: result.rev };

      if (this.isOnline) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${vaccinationData.patientId}/vaccinations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vaccin: vaccinationData.vaccin,
              lot: vaccinationData.lot,
              dateAdministration: vaccinationData.dateAdministration,
              prochainRappel: vaccinationData.prochainRappel,
              administrePar: vaccinationData.administrePar,
              reactions: vaccinationData.reactions
            })
          });

          if (response.ok) {
            const backendResult = await response.json();
            const updatedVaccination = {
              ...newVaccination,
              backendId: backendResult.id,
              syncStatus: 'synced'
            };
            await this.localDB.put(updatedVaccination);
            return updatedVaccination;
          }
        } catch (error) {
          console.error('Erreur sync vaccination:', error);
        }
      }

      return newVaccination;
    } catch (error) {
      console.error('Erreur création vaccination:', error);
      throw error;
    }
  }

  // Méthodes pour les notes
  async getNotesByPatient(patientId) {
    try {
      console.log('Début getNotesByPatient pour', patientId);
      const result = await this.localDB.find({
        selector: {
          type: 'note',
          patientId: patientId
        }
      });
      console.log('Résultat brut notes:', result);

      // Manual sorting since we can't use sort without an index
      const notes = result.docs.sort((a, b) => {
        return new Date(b.date || 0) - new Date(a.date || 0);
      });
      console.log('Notes triées:', notes);

      const formattedNotes = notes.map(note => ({
        ...note,
        id: note._id,
        status: this.getDocumentStatus(note)
      }));
      console.log('Notes formatées:', formattedNotes);

      return formattedNotes;
    } catch (error) {
      console.error('Erreur récupération notes:', error);
      throw error;
    }
  }

  async createNote(noteData) {
    try {
      const noteDoc = {
        _id: this.generateId('note'),
        type: 'note',
        ...noteData,
        date: noteData.date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        syncStatus: this.isOnline ? 'pending' : 'pending'
      };

      const result = await this.localDB.put(noteDoc);
      const newNote = { ...noteDoc, _rev: result.rev };

      if (this.isOnline) {
        try {
          const response = await fetch(`${this.backendURL}/api/patients/${noteData.patientId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: noteData.date,
              auteur: noteData.auteur,
              contenu: noteData.contenu
            })
          });

          if (response.ok) {
            const backendResult = await response.json();
            const updatedNote = {
              ...newNote,
              backendId: backendResult.id,
              syncStatus: 'synced'
            };
            await this.localDB.put(updatedNote);
            return updatedNote;
          }
        } catch (error) {
          console.error('Erreur sync note:', error);
        }
      }

      return newNote;
    } catch (error) {
      console.error('Erreur création note:', error);
      throw error;
    }
  }


  // Méthodes de maintenance
  async compactDB() {
    try {
      await this.localDB.compact();
      console.log('Base de données compactée');
    } catch (error) {
      console.error('Erreur compactage DB:', error);
    }
  }

  async clearDB() {
    try {
      await this.localDB.destroy();
      this.localDB = createDatabase('medical_records');
      await this.initializeDB();
      console.log('Base de données réinitialisée');
    } catch (error) {
      console.error('Erreur réinitialisation DB:', error);
    }
  }

  // Méthode pour forcer la synchronisation
  async forceSyncWithBackend() {
    await this.syncWithBackend();
  }

  // Méthode pour fermer proprement la base de données
  async close() {
    try {
      await this.localDB.close();
      console.log('Base de données fermée');
    } catch (error) {
      console.error('Erreur fermeture DB:', error);
    }
  }

  // Méthode pour forcer la synchronisation complète (vider DB locale et recharger)
  async forceFullSync() {
    try {
      console.log('Synchronisation complète forcée...');
      
      // Vider la base locale
      await this.clearDB();
      
      // Recharger depuis le backend
      await this.loadInitialDataFromBackend();
      
      // Synchroniser à nouveau
      await this.syncWithBackend();
      
      console.log('Synchronisation complète forcée terminée avec succès');
      return true;
    } catch (error) {
      console.error('Erreur synchronisation complète forcée:', error);
      return false;
    }
  }
  
  // Méthode pour créer des données de test (vaccinations et antécédents)
  async createTestData(patientId) {
    try {
      console.log('Création de données de test pour le patient:', patientId);
      
      // Créer des vaccinations de test
      const vaccinations = [
        {
          _id: this.generateId('vaccination'),
          type: 'vaccination',
          patientId: patientId,
          vaccin: 'COVID-19',
          lot: 'LOT123456',
          dateAdministration: new Date().toISOString(),
          prochainRappel: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          administrePar: 'Dr. Kouassi',
          reactions: 'Aucune',
          status: 'à jour',
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          _id: this.generateId('vaccination'),
          type: 'vaccination',
          patientId: patientId,
          vaccin: 'Tétanos',
          lot: 'LOT789012',
          dateAdministration: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          prochainRappel: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          administrePar: 'Dr. Diallo',
          reactions: 'Légère douleur au site d\'injection',
          status: 'retard',
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Créer des antécédents de test
      const antecedents = [
        {
          _id: this.generateId('antecedent'),
          type: 'antecedent',
          patientId: patientId,
          type: 'Médical',
          description: 'Hypertension artérielle',
          date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          _id: this.generateId('antecedent'),
          type: 'antecedent',
          patientId: patientId,
          type: 'Chirurgical',
          description: 'Appendicectomie',
          date: new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        },
        {
          _id: this.generateId('antecedent'),
          type: 'antecedent',
          patientId: patientId,
          type: 'Allergique',
          description: 'Allergie à la pénicilline',
          date: new Date().toISOString(),
          syncStatus: 'pending',
          createdAt: new Date().toISOString()
        }
      ];
      
      // Ajouter les vaccinations
      for (const vaccination of vaccinations) {
        await this.localDB.put(vaccination);
      }
      
      // Ajouter les antécédents
      for (const antecedent of antecedents) {
        await this.localDB.put(antecedent);
      }
      
      console.log('Données de test créées avec succès');
      return true;
    } catch (error) {
      console.error('Erreur création données de test:', error);
      return false;
    }
  }

  // Initialiser le store d'authentification
  async setupAuthStore() {
    try {
      await this.authDB.createIndex({
        index: { fields: ['email'] }
      });
      console.log('Auth store initialized');
    } catch (error) {
      console.error('Error setting up auth store:', error);
    }
  }

  // Stocker les informations d'authentification localement
  async storeAuthCredentials(userData) {
  try {
    const { email, password, role, nom, prenom, id } = userData;
    
    // Vérifier si l'utilisateur existe déjà
    const existing = await this.authDB.find({
      selector: {
        type: 'auth_credentials',
        email: { $eq: email }
      }
    });

    // Hash du mot de passe
    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    if (existing.docs.length > 0) {
      // Mise à jour des credentials existants
      await this.authDB.put({
        ...existing.docs[0],
        password: hashedPassword,
        role,
        nom,
        prenom,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Création de nouveaux credentials
      await this.authDB.put({
        _id: `user_${id}`,
        type: 'auth_credentials',
        email,
        password: hashedPassword,
        role,
        nom,
        prenom,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    console.log('Credentials stored locally');
    return true;
  } catch (error) {
    console.error('Error storing credentials:', error);
    return false;
  }
}

  // Authentification locale
  async authenticateLocally(email, password) {
    try {
      // Rechercher l'utilisateur dans les deux bases
      const [authResult, localResult] = await Promise.all([
        this.authDB.find({
          selector: {
            type: 'auth_credentials',
            email: { $eq: email }
          }
        }),
        this.localDB.find({
          selector: {
            type: 'user',
            email: { $eq: email }
          }
        })
      ]);

      const user = authResult.docs[0] || localResult.docs[0];
      console.log('Utilisateur trouvé:', user);

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      // Pour les credentials stockés localement
      if (user.type === 'auth_credentials') {
        const isValid = await bcryptjs.compare(password, user.password);
        if (!isValid) {
          throw new Error('Mot de passe incorrect');
        }
        return {
          id: user._id.replace('user_', ''),
          email: user.email,
          role: user.role,
          nom: user.nom,
          prenom: user.prenom
        };
      }
      
      // Pour les utilisateurs synchronisés
      if (user.type === 'user') {
        if (!this.isOnline) {
          throw new Error('Mode hors ligne : authentification impossible pour cet utilisateur');
        }
        
        try {
          const response = await fetch(`${this.backendURL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            throw new Error('Authentification échouée');
          }

          const data = await response.json();
          
          // Stocker les credentials pour une utilisation hors ligne future
          await this.storeAuthCredentials({
            id: data.user.id,
            email: data.user.email,
            password: password, // On stocke le mot de passe non haché pour le hash local
            role: data.user.role,
            nom: data.user.nom,
            prenom: data.user.prenom
          });

          return {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role,
            nom: data.user.nom,
            prenom: data.user.prenom
          };
        } catch (error) {
          if (!navigator.onLine) {
            throw new Error('Mode hors ligne : authentification impossible');
          }
          throw error;
        }
      }

      throw new Error('Type d\'utilisateur non reconnu');
    } catch (error) {
      console.error('Local authentication error:', error);
      throw error;
    }
  }

  // Vérifier si les credentials existent localement
  async hasLocalCredentials(email) {
    try {
      const result = await this.authDB.find({
        selector: {
          type: 'auth_credentials',
          email: { $eq: email }
        }
      });
      return result.docs.length > 0;
    } catch (error) {
      console.error('Error checking local credentials:', error);
      return false;
    }
  }

  // Supprimer les credentials locaux
  async clearLocalCredentials() {
    try {
      const result = await this.authDB.find({
        selector: {
          type: 'auth_credentials'
        }
      });

      for (const doc of result.docs) {
        await this.authDB.remove(doc);
      }

      console.log('Local credentials cleared');
      return true;
    } catch (error) {
      console.error('Error clearing credentials:', error);
      return false;
    }
  }
}

export default new PouchService();