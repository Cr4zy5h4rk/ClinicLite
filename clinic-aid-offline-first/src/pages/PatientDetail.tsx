import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import pouchService from '@/services/pouchService';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Edit, 
  Plus, 
  FileText, 
  Activity, 
  Syringe,
  AlertCircle,
  CheckCircle,
  Clock,
  Stethoscope,
  Loader2,
  Database
} from 'lucide-react';

export default function PatientDetail() {
  const { id } = useParams();
  const { 
    getPatient,
    getAntecedents,
    getConsultationsByPatient,
    getVaccinationsByPatient,
    getNotes,
    createAntecedent,
    createVaccination,
    createNote,
    loading,
    error: patientsError
  } = usePatients();

  const [patient, setPatient] = useState(null);
  const [antecedents, setAntecedents] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [notes, setNotes] = useState([]);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPatientData = async () => {
      try {
        if (!id) return;

        // Charger les données du patient
        const patientData = await getPatient(id);
        setPatient(patientData);
        console.log('Patient chargé:', patientData);

        // Charger les antécédents
        try {
          console.log('Chargement des antécédents pour le patient:', id);
          const antecedentsData = await getAntecedents(id);
          console.log('Antécédents chargés:', antecedentsData);
          setAntecedents(antecedentsData);
        } catch (antecedentErr) {
          console.error('Erreur chargement antécédents:', antecedentErr);
          setError('Erreur chargement antécédents: ' + antecedentErr.message);
        }

        // Charger les consultations
        try {
          console.log('Chargement des consultations pour le patient:', id);
          const consultationsData = await getConsultationsByPatient(id);
          console.log('Consultations chargées:', consultationsData);
          setConsultations(consultationsData);
        } catch (consultationErr) {
          console.error('Erreur chargement consultations:', consultationErr);
        }

        // Charger les vaccinations
        try {
          console.log('Chargement des vaccinations pour le patient:', id);
          const vaccinationsData = await getVaccinationsByPatient(id);
          console.log('Vaccinations chargées:', vaccinationsData);
          setVaccinations(vaccinationsData);
        } catch (vaccinationErr) {
          console.error('Erreur chargement vaccinations:', vaccinationErr);
          setError('Erreur chargement vaccinations: ' + vaccinationErr.message);
        }

        // Charger les notes
        try {
          console.log('Chargement des notes pour le patient:', id);
          const notesData = await getNotes(id);
          console.log('Notes chargées:', notesData);
          setNotes(notesData);
        } catch (notesErr) {
          console.error('Erreur chargement notes:', notesErr);
          setError('Erreur chargement notes: ' + notesErr.message);
        }

      } catch (err) {
        console.error('Erreur générale:', err);
        setError(err.message);
      }
    };

    loadPatientData();
  }, [id, getPatient, getAntecedents, getConsultationsByPatient, getVaccinationsByPatient, getNotes]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const newNoteData = {
        patientId: id,
        date: new Date().toISOString(),
        auteur: 'Utilisateur actuel', // À remplacer par l'utilisateur connecté
        contenu: newNote
      };

      await createNote(newNoteData);
      
      // Recharger les notes
      const updatedNotes = await getNotes(id);
      setNotes(updatedNotes);
      
      setNewNote('');
      setIsNoteDialogOpen(false);
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la note:', err);
      setError('Erreur lors de l\'ajout de la note');
    }
  };

  const handleAddVaccination = async (vaccinationData) => {
    try {
      await createVaccination({
        patientId: id,
        ...vaccinationData
      });
      
      // Recharger les vaccinations
      const updatedVaccinations = await getVaccinationsByPatient(id);
      setVaccinations(updatedVaccinations);
      
    } catch (err) {
      console.error('Erreur lors de l\'ajout de la vaccination:', err);
      setError('Erreur lors de l\'ajout de la vaccination');
    }
  };

  const handleAddAntecedent = async (antecedentData) => {
    try {
      await createAntecedent({
        patientId: id,
        ...antecedentData
      });
      
      // Recharger les antécédents
      const updatedAntecedents = await getAntecedents(id);
      setAntecedents(updatedAntecedents);
      
    } catch (err) {
      console.error('Erreur lors de l\'ajout de l\'antécédent:', err);
      setError('Erreur lors de l\'ajout de l\'antécédent');
    }
  };

  const calculateAge = (dateNaissance) => {
    if (!dateNaissance) return '';
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'synced':
        return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Synchronisé</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
      case 'offline':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Hors ligne</Badge>;
      default:
        return null;
    }
  };

  const getVaccinStatus = (status) => {
    switch (status) {
      case 'à jour':
        return <Badge variant="default" className="text-xs">À jour</Badge>;
      case 'bientôt':
        return <Badge variant="secondary" className="text-xs">Bientôt</Badge>;
      case 'retard':
        return <Badge variant="destructive" className="text-xs">En retard</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getConsultationStatusBadge = (status) => {
    switch (status) {
      case 'terminée':
        return <Badge variant="default" className="text-xs">Terminée</Badge>;
      case 'en_cours':
        return <Badge variant="secondary" className="text-xs">En cours</Badge>;
      case 'programmée':
        return <Badge variant="outline" className="text-xs">Programmée</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getAntecedentTypeBadge = (type) => {
    const variants = {
      'Médical': 'default',
      'Chirurgical': 'secondary',
      'Familial': 'outline',
      'Allergique': 'destructive'
    };
    return <Badge variant={variants[type] || 'outline'} className="mt-0.5">{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement des données du patient...</p>
        </div>
      </div>
    );
  }

  if (patientsError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Erreur: {patientsError}</p>
          <Link to="/patients">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Patient non trouvé</p>
          <Link to="/patients">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la liste
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec navigation */}
      <div className="flex items-center gap-4">
        <Link to="/patients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {patient.prenom} {patient.nom}
          </h1>
          <p className="text-slate-600">Patient #{patient.numeroPatient}</p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(patient.status)}
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Modifier
          </Button>
          <Link to={`/consultations/new?patient=${patient.id}`}>
            <Button>
              <Stethoscope className="w-4 h-4 mr-2" />
              Nouvelle consultation
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              try {
                await pouchService.createTestData(patient._id);
                // Recharger les données
                const antecedentsData = await getAntecedents(id);
                setAntecedents(antecedentsData);
                const vaccinationsData = await getVaccinationsByPatient(id);
                setVaccinations(vaccinationsData);
                alert('Données de test créées avec succès');
              } catch (err) {
                console.error('Erreur création données test:', err);
                setError('Erreur création données test');
              }
            }}
          >
            <Database className="w-4 h-4 mr-2" />
            Créer données test
          </Button>
        </div>
      </div>

      {/* Informations générales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Informations personnelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-slate-700 mb-3">Identité</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{formatDate(patient.dateNaissance)} ({calculateAge(patient.dateNaissance)} ans)</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>{patient.sexe === 'M' ? 'Masculin' : 'Féminin'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Profession:</span>
                  <span>{patient.profession || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Situation:</span>
                  <span>{patient.situationMatrimoniale || 'Non renseigné'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-slate-700 mb-3">Contact</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{patient.telephone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{patient.adresse || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Urgence:</span>
                  <span>{patient.contactUrgence || 'Non renseigné'}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-slate-700 mb-3">Administratif</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">N° Patient:</span>
                  <span className="font-mono">{patient.numeroPatient}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Enregistré le:</span>
                  <span>{formatDate(patient.dateEnregistrement)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Dernière visite:</span>
                  <span>{formatDate(patient.lastVisit)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Consultations:</span>
                  <span>{patient.consultations || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Onglets pour les détails */}
      <Tabs defaultValue="consultations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultations">Consultations ({consultations.length})</TabsTrigger>
          <TabsTrigger value="antecedents">Antécédents ({antecedents.length})</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations ({vaccinations.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="consultations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Historique des consultations
                </div>
                <Link to={`/consultations/new?patient=${patient.id}`}>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle consultation
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {consultations.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucune consultation enregistrée</p>
                ) : (
                  consultations.map((consultation) => (
                    <div key={consultation.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-slate-900">{consultation.motif}</h4>
                          <p className="text-sm text-slate-600">
                            {formatDate(consultation.date)} - {consultation.medecin}
                          </p>
                        </div>
                        {getConsultationStatusBadge(consultation.status)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-slate-500">Poids:</span>
                          <span className="ml-1 font-medium">{consultation.poids || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Tension:</span>
                          <span className="ml-1 font-medium">{consultation.tension || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Temp:</span>
                          <span className="ml-1 font-medium">{consultation.temperature || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Taille:</span>
                          <span className="ml-1 font-medium">{consultation.taille || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="text-sm">
                        <span className="text-slate-500">Diagnostic:</span>
                        <span className="ml-1">{consultation.diagnostic || 'Non renseigné'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="antecedents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Antécédents médicaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {antecedents.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucun antécédent enregistré</p>
                ) : (
                  antecedents.map((antecedent) => (
                    <div key={antecedent.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      {getAntecedentTypeBadge(antecedent.type)}
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{antecedent.description}</p>
                        <p className="text-sm text-slate-500">
                          {antecedent.date ? `Noté le ${formatDate(antecedent.date)}` : 'Date non renseignée'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vaccinations">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="w-5 h-5" />
                Suivi des vaccinations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vaccinations.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucune vaccination enregistrée</p>
                ) : (
                  vaccinations.map((vaccination) => (
                    <div key={vaccination.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-slate-900">{vaccination.vaccin}</h4>
                        <p className="text-sm text-slate-600">
                          Dernière dose: {formatDate(vaccination.dateAdministration)}
                        </p>
                        <p className="text-sm text-slate-500">
                          Prochain rappel: {formatDate(vaccination.prochainRappel)}
                        </p>
                        {vaccination.administrePar && (
                          <p className="text-sm text-slate-500">
                            Administré par: {vaccination.administrePar}
                          </p>
                        )}
                      </div>
                      {getVaccinStatus(vaccination.status)}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes cliniques
                </div>
                <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une note
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nouvelle note clinique</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="note">Contenu de la note</Label>
                        <Textarea 
                          id="note" 
                          placeholder="Saisissez votre note clinique..."
                          rows={6}
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={handleAddNote}>
                          Enregistrer
                        </Button>
                        <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucune note clinique enregistrée</p>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-sm text-slate-500">
                          {formatDate(note.date)} - {note.auteur}
                        </p>
                      </div>
                      <p className="text-slate-900">{note.contenu}</p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}