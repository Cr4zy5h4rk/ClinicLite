import { useState, useEffect } from 'react';
import { usePatients } from '@/hooks/usePatients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Syringe, 
  Calendar as CalendarIcon, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus,
  Search,
  Filter,
  Download,
  User,
  Bell,
  Loader2,
  X,
  Edit,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Patient {
  id: number;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string;
  telephone: string;
  numeroPatient: string;
}

interface Vaccination {
  id: number;
  patientId: number;
  patientNom?: string;
  patientPrenom?: string;
  vaccin: string;
  lot: string;
  dateAdministration: string;
  prochainRappel?: string;
  status: 'à jour' | 'bientôt' | 'retard';
  administrePar: string;
  reactions?: string;
  created_at: string;
}

interface VaccinCalendar {
  id: number;
  patientNom: string;
  patientPrenom: string;
  vaccin: string;
  dateRappel: string;
  priority: 'high' | 'medium' | 'low';
  status: string;
}

interface NewVaccination {
  patientId: string;
  vaccin: string;
  lot: string;
  dateAdministration: string;
  prochainRappel: string;
  administrePar: string;
  reactions: string;
}

export default function Vaccinations() {
  const {
    patients,
    loading,
    error: patientsError,
    isOnline,
    syncStatus,
    createVaccination,
    getVaccinations,
    getVaccinationsByPatient,
    updateVaccination,
    deleteVaccination,
    forceSync
  } = usePatients();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isNewVaccinDialogOpen, setIsNewVaccinDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<Vaccination | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [rappelsCalendar, setRappelsCalendar] = useState<VaccinCalendar[]>([]);

  // État formulaire nouvelle vaccination
  const [newVaccination, setNewVaccination] = useState<NewVaccination>({
    patientId: '',
    vaccin: '',
    lot: '',
    dateAdministration: new Date().toISOString().split('T')[0],
    prochainRappel: '',
    administrePar: '',
    reactions: ''
  });

  // Charger les vaccinations
  const loadVaccinations = async () => {
    try {
      const allVaccinations = [];
      for (const patient of patients) {
        const patientVaccinations = await getVaccinationsByPatient(patient._id);
        allVaccinations.push(...patientVaccinations.map(v => ({
          ...v,
          patientNom: patient.nom,
          patientPrenom: patient.prenom,
          status: calculateVaccinationStatus(v.prochainRappel)
        })));
      }
      setVaccinations(allVaccinations);

      // Créer le calendrier des rappels
      const rappels = allVaccinations
        .filter(vacc => vacc.prochainRappel)
        .map(vacc => ({
          id: vacc.id,
          patientNom: vacc.patientNom,
          patientPrenom: vacc.patientPrenom,
          vaccin: vacc.vaccin,
          dateRappel: vacc.prochainRappel,
          priority: calculatePriority(vacc.prochainRappel),
          status: vacc.status
        }));
      setRappelsCalendar(rappels);
    } catch (err) {
      console.error('Erreur chargement vaccinations:', err);
      setError('Impossible de charger les vaccinations');
    }
  };

  // Gestion création vaccination
  const handleCreateVaccination = async () => {
    try {
      if (!newVaccination.patientId || !newVaccination.vaccin || !newVaccination.dateAdministration) {
        setError('Veuillez remplir tous les champs obligatoires');
        return;
      }

      await createVaccination(newVaccination);
      setSuccess('Vaccination enregistrée avec succès');
      setIsNewVaccinDialogOpen(false);
      setNewVaccination({
        patientId: '',
        vaccin: '',
        lot: '',
        dateAdministration: new Date().toISOString().split('T')[0],
        prochainRappel: '',
        administrePar: '',
        reactions: ''
      });
      await loadVaccinations();
    } catch (err) {
      console.error('Erreur création vaccination:', err);
      setError('Impossible d\'enregistrer la vaccination');
    }
  };

  const generateCertificate = async (patientId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/patients/${patientId}/vaccinations/certificate`, {
        method: 'GET'
      });

      if (!response.ok) throw new Error('Erreur lors de la génération du certificat');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificat_vaccination_${patientId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Certificat généré avec succès');
    } catch (err) {
      console.error('Erreur certificat:', err);
      setError('Impossible de générer le certificat');
    }
  };

  // Effects
  useEffect(() => {
    if (patients.length > 0) {
      loadVaccinations();
    }
  }, [patients]);

  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Fonctions utilitaires
  const calculateVaccinationStatus = (prochainRappel: string | null): 'à jour' | 'bientôt' | 'retard' => {
    if (!prochainRappel) return 'à jour';
    
    const rappelDate = new Date(prochainRappel);
    const today = new Date();
    const diffDays = Math.ceil((rappelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'retard';
    if (diffDays <= 30) return 'bientôt';
    return 'à jour';
  };

  const calculatePriority = (dateRappel: string): 'high' | 'medium' | 'low' => {
    const rappelDate = new Date(dateRappel);
    const today = new Date();
    const diffDays = Math.ceil((rappelDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'high';
    if (diffDays <= 7) return 'high';
    if (diffDays <= 30) return 'medium';
    return 'low';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'à jour':
        return <Badge variant="default" className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />À jour</Badge>;
      case 'bientôt':
        return <Badge variant="secondary" className="text-xs"><Clock className="w-3 h-3 mr-1" />Bientôt</Badge>;
      case 'retard':
        return <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" />En retard</Badge>;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      case 'low': return 'border-l-green-500 bg-green-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  const filteredVaccinations = vaccinations.filter(vaccination => {
    const matchesSearch = 
      vaccination.patientNom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccination.patientPrenom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vaccination.vaccin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || vaccination.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const todayRappels = rappelsCalendar.filter(rappel => {
    const today = new Date().toISOString().split('T')[0];
    return rappel.dateRappel === today;
  });

  return (
    <div className="space-y-6">
      {/* Alertes */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            {success}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSuccess(null)}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Module de vaccination</h1>
          <p className="text-slate-600">Suivi des vaccinations et rappels</p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={loadVaccinations} variant="outline" disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Actualiser
          </Button>
          
          <Dialog open={isNewVaccinDialogOpen} onOpenChange={setIsNewVaccinDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle vaccination
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enregistrer une vaccination</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient">Patient *</Label>
                  <Select 
                    value={newVaccination.patientId} 
                    onValueChange={(value) => setNewVaccination({...newVaccination, patientId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.nom} {patient.prenom} ({patient.numeroPatient})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="vaccin">Vaccin *</Label>
                  <Select 
                    value={newVaccination.vaccin} 
                    onValueChange={(value) => setNewVaccination({...newVaccination, vaccin: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type de vaccin" />
                    </SelectTrigger>
                    <SelectContent>
                      {['BCG', 'Hépatite B', 'Polio', 'DTC', 'Rougeole', 'Fièvre jaune', 'Méningite', 'Tétanos', 'COVID-19', 'Grippe', 'Pneumocoque'].map(vaccin => (
                        <SelectItem key={vaccin} value={vaccin}>{vaccin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="lot">N° de lot</Label>
                    <Input 
                      id="lot" 
                      placeholder="Ex: TET2024-001" 
                      value={newVaccination.lot}
                      onChange={(e) => setNewVaccination({...newVaccination, lot: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date admin. *</Label>
                    <Input 
                      id="date" 
                      type="date" 
                      value={newVaccination.dateAdministration}
                      onChange={(e) => setNewVaccination({...newVaccination, dateAdministration: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="rappel">Prochain rappel</Label>
                  <Input 
                    id="rappel" 
                    type="date" 
                    value={newVaccination.prochainRappel}
                    onChange={(e) => setNewVaccination({...newVaccination, prochainRappel: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="administre">Administré par</Label>
                  <Select 
                    value={newVaccination.administrePar} 
                    onValueChange={(value) => setNewVaccination({...newVaccination, administrePar: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {['Dr. Konan', 'Dr. Kouamé', 'Dr. Diabaté', 'Dr. Ouattara', 'Inf. Diabé', 'Inf. Kone', 'Inf. Traoré'].map(medecin => (
                        <SelectItem key={medecin} value={medecin}>{medecin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="reactions">Réactions observées</Label>
                  <Textarea 
                    id="reactions" 
                    placeholder="Aucune réaction particulière..." 
                    rows={3}
                    value={newVaccination.reactions}
                    onChange={(e) => setNewVaccination({...newVaccination, reactions: e.target.value})}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1" 
                    onClick={handleCreateVaccination}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Enregistrer
                  </Button>
                  <Button variant="outline" onClick={() => setIsNewVaccinDialogOpen(false)}>
                    Annuler
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alertes du jour */}
      {todayRappels.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Bell className="w-5 h-5" />
              Rappels du jour ({todayRappels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {todayRappels.map((rappel) => (
                <div key={rappel.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium text-slate-900">{rappel.patientNom} {rappel.patientPrenom}</p>
                    <p className="text-sm text-slate-600">{rappel.vaccin}</p>
                  </div>
                  <Button size="sm" variant="outline">
                    Programmer
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="suivi" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="suivi">Suivi vaccinal</TabsTrigger>
          <TabsTrigger value="calendrier">Calendrier</TabsTrigger>
          <TabsTrigger value="certificats">Certificats</TabsTrigger>
        </TabsList>

        <TabsContent value="suivi">
          {/* Filtres */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher par patient ou vaccin..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="à jour">À jour</SelectItem>
                    <SelectItem value="bientôt">Bientôt</SelectItem>
                    <SelectItem value="retard">En retard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Liste des vaccinations */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-600">Chargement...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredVaccinations.map((vaccination) => (
                <Card key={vaccination.id}>
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {vaccination.patientNom} {vaccination.patientPrenom}
                            </h3>
                            <p className="text-slate-600">{vaccination.vaccin}</p>
                          </div>
                          {getStatusBadge(vaccination.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="text-slate-400">Date admin:</span>
                            <p className="font-medium">{new Date(vaccination.dateAdministration).toLocaleDateString('fr-FR')}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Lot:</span>
                            <p className="font-medium font-mono">{vaccination.lot}</p>
                          </div>
                          <div>
                            <span className="text-slate-400">Administré par:</span>
                            <p className="font-medium">{vaccination.administrePar}</p>
                          </div>
                          {vaccination.prochainRappel && (
                            <div>
                              <span className="text-slate-400">Prochain rappel:</span>
                              <p className="font-medium">{new Date(vaccination.prochainRappel).toLocaleDateString('fr-FR')}</p>
                            </div>
                          )}
                          {vaccination.reactions && (
                            <div className="md:col-span-2">
                              <span className="text-slate-400">Réactions:</span>
                              <p className="font-medium">{vaccination.reactions}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generateCertificate(vaccination.patientId.toString())}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Certificat
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingVaccination(vaccination);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => deleteVaccination(vaccination.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendrier">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendrier */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" />
                  Calendrier des rappels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Rappels à venir */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Rappels programmés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rappelsCalendar.slice(0, 10).map((rappel) => (
                    <div
                      key={rappel.id}
                      className={cn(
                        "p-4 border-l-4 rounded-r-lg",
                        getPriorityColor(rappel.priority)
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-slate-900">{rappel.patientNom} {rappel.patientPrenom}</h4>
                          <p className="text-sm text-slate-600">{rappel.vaccin}</p>
                          <p className="text-sm text-slate-500">
                            {new Date(rappel.dateRappel).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Button size="sm" variant="outline">
                          Confirmer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="certificats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Génération de certificats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-12">
                <Syringe className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  Génération de certificats de vaccination
                </h3>
                <p className="text-slate-600 mb-6">
                  Sélectionnez un patient pour générer son certificat de vaccination
                </p>
                
                <div className="max-w-sm mx-auto space-y-4">
                  <Select onValueChange={(value) => generateCertificate(parseInt(value).toString())}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(patient => (
                        <SelectItem key={patient.id} value={patient.id.toString()}>
                          {patient.nom} {patient.prenom} ({patient.numeroPatient})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    className="w-full"
                    onClick={() => {
                      const selectedPatient = patients[0]; // Juste pour l'exemple
                      if (selectedPatient) {
                        generateCertificate(selectedPatient.id);
                      }
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Générer le certificat PDF
                  </Button>
                </div>
              </div>
              
              <div className="border-t pt-6">
                <h4 className="font-medium text-slate-900 mb-4">Historique des certificats générés</h4>
                <div className="space-y-2">
                  {vaccinations
                    .filter(v => v.dateAdministration)
                    .slice(0, 3)
                    .map(vaccination => (
                      <div key={vaccination.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {vaccination.patientNom} {vaccination.patientPrenom}
                          </p>
                          <p className="text-sm text-slate-600">
                            {vaccination.vaccin} - {new Date(vaccination.dateAdministration).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => generateCertificate(vaccination.patientId.toString())}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Regénérer
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}