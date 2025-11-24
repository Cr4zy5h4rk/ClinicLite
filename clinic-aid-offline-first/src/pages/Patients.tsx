import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  Plus, 
  Filter, 
  Eye, 
  Edit, 
  Calendar,
  User,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';

interface Patient {
  _id: string;
  id: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: 'M' | 'F';
  telephone: string;
  adresse: string;
  profession?: string;
  situationMatrimoniale?: string;
  contactUrgence?: string;
  lastVisit?: string;
  status: 'synced' | 'pending' | 'offline';
  consultations: number;
  numeroPatient?: string;
  dateEnregistrement?: string;
}

interface NewPatientForm {
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: 'M' | 'F' | '';
  telephone: string;
  adresse: string;
  profession: string;
  situationMatrimoniale: string;
  contactUrgence: string;
  numeroPatient: string;
}

export default function Patients() {
  const {
    patients,
    loading,
    error,
    isOnline,
    syncStatus,
    pendingChanges,
    createPatient,
    updatePatient,
    deletePatient,
    searchPatients,
    forceSync,
    refresh,
    clearError
  } = usePatients();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterSex, setFilterSex] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState([]);

  const [newPatient, setNewPatient] = useState<NewPatientForm>({
    nom: '',
    prenom: '',
    dateNaissance: '',
    sexe: '',
    telephone: '',
    adresse: '',
    profession: '',
    situationMatrimoniale: '',
    contactUrgence: '',
    numeroPatient: ''
  });

  useEffect(() => {
  console.log('Patients:', patients);
  console.log('Filtered patients:', filteredPatients);
}, [patients, filteredPatients]);

  useEffect(() => {
    let filtered = patients;

    
    if (searchTerm) {
      filtered = patients.filter(patient => 
        patient.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.telephone.includes(searchTerm) ||
        (patient.numeroPatient && patient.numeroPatient.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    
    if (filterSex !== 'all') {
      filtered = filtered.filter(patient => patient.sexe === filterSex);
    }

    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(patient => patient.status === filterStatus);
    }

    setFilteredPatients(filtered);
  }, [patients, searchTerm, filterSex, filterStatus]);

  // Générer un numéro de patient automatique
  const generatePatientNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `P${timestamp}`;
  };

  // Fonction pour ajouter un nouveau patient
  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPatient.nom || !newPatient.prenom || !newPatient.dateNaissance || !newPatient.sexe) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const patientData = {
        ...newPatient,
        numeroPatient: newPatient.numeroPatient || generatePatientNumber()
      };

      await createPatient(patientData);
      
      // Réinitialiser le formulaire
      setNewPatient({
        nom: '',
        prenom: '',
        dateNaissance: '',
        sexe: '',
        telephone: '',
        adresse: '',
        profession: '',
        situationMatrimoniale: '',
        contactUrgence: '',
        numeroPatient: ''
      });
      
      setIsAddDialogOpen(false);
      
    } catch (err) {
      console.error('Erreur lors de l\'ajout du patient:', err);
      alert('Erreur lors de l\'ajout du patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
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

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Badge variant="secondary" className="text-xs"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Synchronisation...</Badge>;
      case 'synced':
        return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />Synchronisé</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs"><AlertCircle className="w-3 h-3 mr-1" />Erreur sync</Badge>;
      case 'offline':
        return <Badge variant="secondary" className="text-xs"><WifiOff className="w-3 h-3 mr-1" />Hors ligne</Badge>;
      default:
        return null;
    }
  };
  

  const calculateAge = (dateNaissance: string) => {
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleInputChange = (field: keyof NewPatientForm, value: string) => {
    setNewPatient(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-slate-600">Chargement des patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statut de connexion */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des patients</h1>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-slate-600">{filteredPatients.length} patients trouvés</p>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="w-4 h-4" />
                  <span className="text-sm">En ligne</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="w-4 h-4" />
                  <span className="text-sm">Hors ligne</span>
                </div>
              )}
              {getSyncStatusBadge()}
              {pendingChanges > 0 && (
                <Badge variant="secondary" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  {pendingChanges} en attente
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={forceSync}
            disabled={!isOnline || syncStatus === 'syncing'}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Synchroniser
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nouveau patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nom">Nom *</Label>
                    <Input 
                      id="nom" 
                      placeholder="Nom de famille"
                      value={newPatient.nom}
                      onChange={(e) => handleInputChange('nom', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input 
                      id="prenom" 
                      placeholder="Prénom"
                      value={newPatient.prenom}
                      onChange={(e) => handleInputChange('prenom', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="naissance">Date de naissance *</Label>
                    <Input 
                      id="naissance" 
                      type="date"
                      value={newPatient.dateNaissance}
                      onChange={(e) => handleInputChange('dateNaissance', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sexe">Sexe *</Label>
                    <Select value={newPatient.sexe} onValueChange={(value) => handleInputChange('sexe', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telephone">Téléphone</Label>
                    <Input 
                      id="telephone" 
                      placeholder="+225 XX XX XX XX"
                      value={newPatient.telephone}
                      onChange={(e) => handleInputChange('telephone', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactUrgence">Contact d'urgence</Label>
                    <Input 
                      id="contactUrgence" 
                      placeholder="+225 XX XX XX XX"
                      value={newPatient.contactUrgence}
                      onChange={(e) => handleInputChange('contactUrgence', e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="profession">Profession</Label>
                    <Input 
                      id="profession" 
                      placeholder="Profession"
                      value={newPatient.profession}
                      onChange={(e) => handleInputChange('profession', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="situationMatrimoniale">Situation matrimoniale</Label>
                    <Select value={newPatient.situationMatrimoniale} onValueChange={(value) => handleInputChange('situationMatrimoniale', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="celibataire">Célibataire</SelectItem>
                        <SelectItem value="marie">Marié(e)</SelectItem>
                        <SelectItem value="divorce">Divorcé(e)</SelectItem>
                        <SelectItem value="veuf">Veuf/Veuve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="adresse">Adresse</Label>
                  <Textarea 
                    id="adresse" 
                    placeholder="Adresse complète"
                    value={newPatient.adresse}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="numeroPatient">Numéro patient</Label>
                  <Input 
                    id="numeroPatient" 
                    placeholder="Généré automatiquement si vide"
                    value={newPatient.numeroPatient}
                    onChange={(e) => handleInputChange('numeroPatient', e.target.value)}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      'Enregistrer'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alertes */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearError();
                refresh();
              }}
            >
              Réessayer
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Mode hors ligne activé. Vos modifications seront synchronisées quand la connexion sera rétablie.
          </AlertDescription>
        </Alert>
      )}

      {/* Filtres et recherche */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, prénom, téléphone ou numéro patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={filterSex} onValueChange={setFilterSex}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sexe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="M">Masculin</SelectItem>
              <SelectItem value="F">Féminin</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="synced">Synchronisé</SelectItem>
              <SelectItem value="pending">En attente</SelectItem>
              <SelectItem value="offline">Hors ligne</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Liste des patients */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient) => (
          <Card key={patient._id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {patient.nom} {patient.prenom}
                  </CardTitle>
                  <p className="text-sm text-slate-600">
                    {patient.numeroPatient}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(patient.status)}
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{calculateAge(patient.dateNaissance)} ans</span>
                  <span className="text-xs">({patient.sexe === 'M' ? 'H' : 'F'})</span>
                </div>
                
                {patient.telephone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    <span>{patient.telephone}</span>
                  </div>
                )}
                
                {patient.adresse && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{patient.adresse}</span>
                  </div>
                )}
                
                {patient.lastVisit && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Clock className="w-4 h-4" />
                    <span>Dernière visite: {new Date(patient.lastVisit).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="flex-1"
                >
                  <Link to={`/patients/${patient._id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Voir
                  </Link>
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                  className="flex-1"
                >
                  <Link to={`/patients/${patient._id}/edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Message si aucun patient trouvé */}
      {filteredPatients.length === 0 && !loading && (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Aucun patient trouvé
          </h3>
          <p className="text-slate-600 mb-4">
            {searchTerm || filterSex !== 'all' || filterStatus !== 'all' 
              ? 'Aucun patient ne correspond à vos critères de recherche.'
              : 'Commencez par ajouter votre premier patient.'
            }
          </p>
          {(searchTerm || filterSex !== 'all' || filterStatus !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setFilterSex('all');
                setFilterStatus('all');
              }}
            >
              Réinitialiser les filtres
            </Button>
          )}
        </div>
      )}
    </div>
  );
}