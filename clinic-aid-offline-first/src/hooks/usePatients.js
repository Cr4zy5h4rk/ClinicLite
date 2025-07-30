// hooks/usePatients.js
import { useState, useEffect, useCallback } from 'react';
import pouchService from '../services/pouchService';

export const usePatients = () => {
  // État existant
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState('idle');
  
  // Nouvel état pour les documents en attente
  const [pendingChanges, setPendingChanges] = useState({
    patients: 0,
    consultations: 0,
    antecedents: 0,
    vaccinations: 0,
    notes: 0,
    total: 0
  });

  // Charger les patients depuis PouchDB
const loadPatients = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('Chargement des patients...'); // <-- Ajout
    const patientsData = await pouchService.getAllPatients();
    console.log('Patients chargés:', patientsData); // <-- Ajout
    
    setPatients(patientsData);
    
    const stats = await pouchService.getStats();
    console.log('Stats:', stats); // <-- Ajout
    setPendingChanges({
      patients: stats.pendingPatients || 0,
      consultations: stats.pendingConsultations || 0,
      antecedents: stats.pendingAntecedents || 0,
      vaccinations: stats.pendingVaccinations || 0,
      notes: stats.pendingNotes || 0,
      total: stats.pendingTotal || 0
    });
    
  } catch (err) {
    console.error('Erreur chargement patientssss:', err);
    setError(err.message || 'Erreur lors du chargement des patients');
  } finally {
    setLoading(false);
  }
}, []);

  // Créer un nouveau patient
  const createPatient = useCallback(async (patientData) => {
    try {
      // Générer un numéro de patient si non fourni
      if (!patientData.numeroPatient) {
        const timestamp = Date.now().toString().slice(-6);
        patientData.numeroPatient = `P${timestamp}`;
      }

      const newPatient = await pouchService.createPatient(patientData);
      
      // Recharger la liste des patients
      await loadPatients();
      
      return newPatient;
    } catch (error) {
      console.error('Erreur création patient:', error);
      throw error;
    }
  }, [loadPatients]);

  // Mettre à jour un patient
  const updatePatient = useCallback(async (patientData) => {
    try {
      const updatedPatient = await pouchService.updatePatient(patientData);
      
      // Mettre à jour la liste locale
      setPatients(prev => 
        prev.map(p => p._id === updatedPatient._id ? updatedPatient : p)
      );
      
      return updatedPatient;
    } catch (error) {
      console.error('Erreur mise à jour patient:', error);
      throw error;
    }
  }, []);

  // Supprimer un patient
  const deletePatient = useCallback(async (patientId, rev) => {
    try {
      await pouchService.deletePatient(patientId, rev);
      
      // Supprimer de la liste locale
      setPatients(prev => prev.filter(p => p._id !== patientId));
      
    } catch (error) {
      console.error('Erreur suppression patient:', error);
      throw error;
    }
  }, []);

  // Rechercher des patients
  const searchPatients = useCallback(async (searchTerm) => {
    try {
      if (!searchTerm.trim()) {
        return await pouchService.getAllPatients();
      }
      
      return await pouchService.searchPatients(searchTerm);
    } catch (error) {
      console.error('Erreur recherche patients:', error);
      throw error;
    }
  }, []);

  // Récupérer un patient spécifique
  const getPatient = useCallback(async (patientId) => {
    try {
      return await pouchService.getPatient(patientId);
    } catch (error) {
      console.error('Erreur récupération patient:', error);
      throw error;
    }
  }, []);
  
  // Créer une nouvelle consultation
  const createConsultation = useCallback(async (consultationData) => {
    try {
      const newConsultation = await pouchService.createConsultation(consultationData);
      await loadPatients(); // Recharger pour mettre à jour les compteurs
      return newConsultation;
    } catch (error) {
      console.error('Erreur création consultation:', error);
      throw error;
    }
  }, [loadPatients]);

  // Créer un nouvel antécédent
  const createAntecedent = useCallback(async (antecedentData) => {
    try {
      const newAntecedent = await pouchService.createAntecedent(antecedentData);
      await loadPatients(); // Recharger pour mettre à jour les compteurs
      return newAntecedent;
    } catch (error) {
      console.error('Erreur création antécédent:', error);
      throw error;
    }
  }, []);

  // Récupérer les antécédents d'un patient
  const getAntecedents = useCallback(async (patientId) => {
    try {
      console.log('Récupération des antécédents pour le patient:', patientId);
      console.log('antecedents:', pouchService.getAntecedentsByPatient(patientId));
      return await pouchService.getAntecedentsByPatient(patientId);
    } catch (error) {
      console.error('Erreur récupération antécédents:', error);
      throw error;
    }
  }, []);

  // Créer une nouvelle vaccination
  const createVaccination = useCallback(async (vaccinationData) => {
    try {
      const newVaccination = await pouchService.createVaccination(vaccinationData);
      await loadPatients(); // Recharger pour mettre à jour les compteurs
      return newVaccination;
    } catch (error) {
      console.error('Erreur création vaccination:', error);
      throw error;
    }
  }, []);

  // Récupérer les vaccinations d'un patient
  const getVaccinationsByPatient = useCallback(async (patientId) => {
    try {
      return await pouchService.getVaccinationsByPatient(patientId);
    } catch (error) {
      console.error('Erreur récupération vaccinations:', error);
      throw error;
    }
  }, []);

  // Récupérer les consultations d'un patient
  const getConsultationsByPatient = useCallback(async (patientId) => {
    try {
      return await pouchService.getConsultationsByPatient(patientId);
    } catch (error) {
      console.error('Erreur récupération consultations:', error);
      throw error;
    }
  }, []);

  // Créer une nouvelle note
  const createNote = useCallback(async (noteData) => {
    try {
      const newNote = await pouchService.createNote(noteData);
      await loadPatients(); // Recharger pour mettre à jour les compteurs
      return newNote;
    } catch (error) {
      console.error('Erreur création note:', error);
      throw error;
    }
  }, []);

  // Récupérer les notes d'un patient
  const getNotes = useCallback(async (patientId) => {
    try {
      return await pouchService.getNotesByPatient(patientId);
    } catch (error) {
      console.error('Erreur récupération notes:', error);
      throw error;
    }
  }, []);

  // Gérer les événements de PouchDB
  useEffect(() => {
    const handlePouchEvent = (event) => {
      switch (event.type) {
        case 'online':
          setIsOnline(true);
          setSyncStatus('syncing');
          break;
          
        case 'offline':
          setIsOnline(false);
          setSyncStatus('offline');
          break;
          
        case 'sync_active':
          setSyncStatus('syncing');
          break;
          
        case 'sync_paused':
          setSyncStatus('paused');
          break;
          
        case 'sync_complete':
          setSyncStatus('synced');
          // Recharger les patients après synchronisation
          loadPatients();
          break;
          
        case 'sync_error':
          setSyncStatus('error');
          setError('Erreur de synchronisation');
          break;
          
        // Nouveaux événements
        case 'antecedent_created':
        case 'antecedent_updated':
        case 'antecedent_deleted':
        case 'vaccination_created':
        case 'vaccination_updated':
        case 'vaccination_deleted':
        case 'note_created':
        case 'note_updated':
        case 'note_deleted':
        case 'patient_created':
        case 'patient_updated':
        case 'patient_deleted':
        case 'consultation_created':
        case 'consultation_updated':
        case 'consultation_deleted':
          // Recharger les patients quand il y a des changements
          loadPatients();
          break;
          
        default:
          break;
      }
    };

    // S'abonner aux événements PouchDB
    const unsubscribe = pouchService.addChangeListener(handlePouchEvent);
    
    return unsubscribe;
  }, [loadPatients]);

  // Charger les patients au montage
  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // Surveiller le statut de connexion
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Forcer la synchronisation
  const forceSync = useCallback(async () => {
    try {
      if (isOnline) {
        setSyncStatus('syncing');
        // Déclencher une synchronisation manuelle
        // pouchService.stopSync();
        pouchService.syncWithBackend();
      }
    } catch (error) {
      console.error('Erreur synchronisation forcée:', error);
      setSyncStatus('error');
    }
  }, [isOnline]);

  // Obtenir les statistiques
  const getStats = useCallback(async () => {
    try {
      const stats = await pouchService.getStats();
      setPendingChanges({
        patients: stats.pendingPatients || 0,
        consultations: stats.pendingConsultations || 0,
        antecedents: stats.pendingAntecedents || 0,
        vaccinations: stats.pendingVaccinations || 0,
        notes: stats.pendingNotes || 0,
        total: stats.pendingTotal || 0
      });
      return stats;
    } catch (error) {
      console.error('Erreur récupération stats:', error);
      return {
        totalPatients: patients.length,
        totalConsultations: 0,
        totalAntecedents: 0,
        totalVaccinations: 0,
        totalNotes: 0,
        pendingSync: 0,
        isOnline
      };
    }
  }, [patients.length, isOnline]);

  return {
    // État
    patients,
    loading,
    error,
    isOnline,
    syncStatus,
    pendingChanges,
    
    // Actions existantes
    createPatient,
    updatePatient,
    deletePatient,
    searchPatients,
    getPatient,
    loadPatients,
    
    // Nouvelles actions
    createAntecedent,
    getAntecedents,
    createConsultation,
    getConsultationsByPatient,
    createVaccination,
    getVaccinationsByPatient,
    createNote,
    getNotes,
    
    // Utilitaires
    forceSync,
    getStats,
    clearError: () => setError(null),
    refresh: loadPatients
  };
};