
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Download, 
  Eye, 
  Calendar,
  User,
  FileText,
  Filter,
  Plus,
  Loader2,
  AlertCircle,
  Activity,
  Heart,
  Stethoscope,
  Brain,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePatients } from '@/hooks/usePatients';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ConsultationsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { 
    patients, 
    loading: patientsLoading, 
    error: patientsError,
    isOnline,
    syncStatus,
    getConsultationsByPatient,
    forceSync
  } = usePatients();

  // Charger toutes les consultations au montage
  useEffect(() => {
    const loadAllConsultations = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Récupérer les consultations pour chaque patient
        const allConsultations = [];
        for (const patient of patients) {
          const patientConsultations = await getConsultationsByPatient(patient._id);
          // Ajouter les informations du patient à chaque consultation
          const consultationsWithPatient = patientConsultations.map(consultation => ({
            ...consultation,
            patient: {
              nom: patient.nom,
              prenom: patient.prenom,
              numeroPatient: patient.numeroPatient
            }
          }));
          allConsultations.push(...consultationsWithPatient);
        }

        // Trier par date (plus récente en premier)
        const sortedConsultations = allConsultations.sort((a, b) => {
          const dateA = new Date(b.dateConsultation || b.date).getTime();
          const dateB = new Date(a.dateConsultation || a.date).getTime();
          return dateA - dateB;
        });

        setConsultations(sortedConsultations);
      } catch (err) {
        setError('Erreur lors du chargement des consultations');
        console.error('Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!patientsLoading && patients.length > 0) {
      loadAllConsultations();
    }
  }, [patients, patientsLoading, getConsultationsByPatient]);

  const filteredConsultations = consultations.filter(consultation => {
    const matchesSearch = 
      consultation.patient.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.patient.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.motif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultation.diagnostic?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || consultation.status === statusFilter;
    
    const consultationDate = new Date(consultation.dateConsultation || consultation.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const matchesDate = dateFilter === 'all' || 
                       (dateFilter === 'today' && consultationDate >= today) ||
                       (dateFilter === 'week' && consultationDate >= weekAgo);
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleDownloadConsultation = async (consultation) => {
    // TODO: Implémenter le téléchargement des consultations
    console.log('Téléchargement consultation:', consultation);
  };

  const handleForceSync = async () => {
    try {
      await forceSync();
    } catch (err) {
      console.error('Erreur synchronisation:', err);
    }
  };

  const handleShowDetails = (consultation) => {
    setSelectedConsultation(consultation);
    setShowDetailsModal(true);
  };

  const ConsultationDetailsModal = () => {
    if (!selectedConsultation) return null;

    return (
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Détails de la consultation
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* En-tête avec les informations du patient */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-lg">
                  {selectedConsultation.patient.nom} {selectedConsultation.patient.prenom}
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                <div>N° Patient: {selectedConsultation.patient.numeroPatient}</div>
                <div>
                  Date: {new Date(selectedConsultation.dateConsultation || selectedConsultation.date).toLocaleDateString('fr-FR')}
                </div>
                <div>Médecin: {selectedConsultation.medecin}</div>
                <div>Durée: {selectedConsultation.duree || 'Non spécifiée'}</div>
              </div>
            </div>

            {/* Motif et symptômes */}
            <div className="space-y-4">
              <div>
                <h4 className="flex items-center gap-2 font-medium mb-2">
                  <Stethoscope className="w-4 h-4" />
                  Motif de consultation
                </h4>
                <p className="text-slate-600">{selectedConsultation.motif}</p>
              </div>
              {selectedConsultation.symptomes && (
                <div>
                  <h4 className="font-medium mb-2">Symptômes</h4>
                  <p className="text-slate-600">{selectedConsultation.symptomes}</p>
                </div>
              )}
            </div>

            {/* Constantes vitales */}
            <div>
              <h4 className="flex items-center gap-2 font-medium mb-3">
                <Activity className="w-4 h-4" />
                Constantes vitales
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedConsultation.poids && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500">Poids</p>
                    <p className="font-medium">{selectedConsultation.poids} kg</p>
                  </div>
                )}
                {selectedConsultation.taille && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500">Taille</p>
                    <p className="font-medium">{selectedConsultation.taille} cm</p>
                  </div>
                )}
                {selectedConsultation.temperature && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500">Température</p>
                    <p className="font-medium">{selectedConsultation.temperature}°C</p>
                  </div>
                )}
                {selectedConsultation.tension && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500">Tension</p>
                    <p className="font-medium">{selectedConsultation.tension}</p>
                  </div>
                )}
                {selectedConsultation.pouls && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500">Pouls</p>
                    <p className="font-medium">{selectedConsultation.pouls} bpm</p>
                  </div>
                )}
                {selectedConsultation.frequenceRespiratoire && (
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-sm text-slate-500">Fréq. respiratoire</p>
                    <p className="font-medium">{selectedConsultation.frequenceRespiratoire}/min</p>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnostic et traitement */}
            <div className="space-y-4">
              <div>
                <h4 className="flex items-center gap-2 font-medium mb-2">
                  <Brain className="w-4 h-4" />
                  Diagnostic
                </h4>
                <p className="text-slate-600">{selectedConsultation.diagnostic}</p>
              </div>
              {selectedConsultation.traitement && (
                <div>
                  <h4 className="flex items-center gap-2 font-medium mb-2">
                    <Heart className="w-4 h-4" />
                    Traitement
                  </h4>
                  <p className="text-slate-600">{selectedConsultation.traitement}</p>
                </div>
              )}
            </div>

            {/* Observations et suivi */}
            {(selectedConsultation.observations || selectedConsultation.prochainRdv) && (
              <div className="space-y-4">
                {selectedConsultation.observations && (
                  <div>
                    <h4 className="font-medium mb-2">Observations</h4>
                    <p className="text-slate-600">{selectedConsultation.observations}</p>
                  </div>
                )}
                {selectedConsultation.prochainRdv && (
                  <div>
                    <h4 className="flex items-center gap-2 font-medium mb-2">
                      <Calendar className="w-4 h-4" />
                      Prochain rendez-vous
                    </h4>
                    <p className="text-slate-600">
                      {new Date(selectedConsultation.prochainRdv).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Statut et synchronisation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Badge variant={selectedConsultation.status === 'terminée' ? 'default' : 'secondary'}>
                {selectedConsultation.status}
              </Badge>
              <Badge 
                variant={selectedConsultation.syncStatus === 'synced' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {selectedConsultation.syncStatus === 'synced' ? 'Synchronisé' : 'Non synchronisé'}
              </Badge>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading || patientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || patientsError) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          {error || patientsError}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Liste des consultations</h1>
          <p className="text-slate-600">
            {filteredConsultations.length} consultation(s) trouvée(s)
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleForceSync}
            disabled={!isOnline || syncStatus === 'syncing'}
          >
            <Download className={`w-4 h-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Synchroniser
          </Button>
          <Button asChild>
            <Link to="/consultations">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle consultation
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Patient, motif, diagnostic..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Statut
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="terminée">Terminée</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="programmée">Programmée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Période
              </label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="today">Aujourd'hui</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des consultations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Motif</TableHead>
                  <TableHead>Diagnostic</TableHead>
                  <TableHead>Médecin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Sync</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConsultations.map((consultation) => (
                  <TableRow key={consultation._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="font-medium">{consultation.patient.nom} {consultation.patient.prenom}</p>
                          <p className="text-xs text-slate-500">{consultation.patient.numeroPatient}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">
                          {new Date(consultation.dateConsultation || consultation.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs truncate" title={consultation.motif}>
                        {consultation.motif}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm max-w-xs truncate" title={consultation.diagnostic}>
                        {consultation.diagnostic}
                      </p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{consultation.medecin}</span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={consultation.status === 'terminée' ? 'default' : 'secondary'}
                      >
                        {consultation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={consultation.syncStatus === 'synced' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {consultation.syncStatus === 'synced' ? 'Sync' : 'Local'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleShowDetails(consultation)}
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadConsultation(consultation)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredConsultations.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune consultation trouvée</p>
              <p className="text-sm text-slate-400 mt-1">
                Modifiez vos critères de recherche ou ajoutez une nouvelle consultation
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      <ConsultationDetailsModal />
    </div>
  );
}
