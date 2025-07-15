import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Stethoscope, 
  User, 
  Calendar, 
  Activity, 
  Heart,
  Brain,
  Save,
  Send,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { usePatients } from '@/hooks/usePatients';

export default function Consultations() {
  // Utiliser le hook usePatients
  const {
    patients,
    loading,
    error: patientsError,
    isOnline,
    syncStatus,
    pendingChanges,
    createConsultation,
    getPatient,
    loadPatients,
    forceSync
  } = usePatients();

  const [selectedPatient, setSelectedPatient] = useState('');
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiMessages, setAiMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider avec cette consultation ?' }
  ]);
  const [aiInput, setAiInput] = useState('');

  const [consultationData, setConsultationData] = useState({
    patientId: '',
    date: new Date().toISOString().split('T')[0],
    motif: '',
    symptomes: '',
    diagnostic: '',
    traitement: '',
    observations: '',
    duree: '',
    prochainRdv: '',
    medecin: 'Dr. Système', // Valeur par défaut
    status: 'terminée',
    // Constantes vitales
    poids: '',
    taille: '',
    tension: '',
    temperature: '',
    pouls: '',
    frequenceRespiratoire: ''
  });

  // Modifier la gestion de la sélection du patient
  const handlePatientSelect = async (patientId) => {
    setSelectedPatient(patientId);
    setConsultationData(prev => ({ ...prev, patientId }));
    
    try {
      const patientDetails = await getPatient(patientId);
      setSelectedPatientInfo(patientDetails);
    } catch (err) {
      setError('Impossible de charger les détails du patient');
      console.error('Erreur:', err);
    }
  };

  // Fonction pour sauvegarder la consultation
  const handleSaveConsultation = async () => {
    if (!consultationData.patientId || !consultationData.motif || !consultationData.diagnostic) {
      setError('Veuillez remplir tous les champs obligatoires (Patient, Motif, Diagnostic)');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createConsultation(consultationData);
      setSuccess('Consultation sauvegardée avec succès !');
      
      // Réinitialiser le formulaire après sauvegarde
      setTimeout(() => {
        setConsultationData({
          patientId: '',
          date: new Date().toISOString().split('T')[0],
          motif: '',
          symptomes: '',
          diagnostic: '',
          traitement: '',
          observations: '',
          duree: '',
          prochainRdv: '',
          medecin: 'Dr. Système',
          status: 'terminée',
          poids: '',
          taille: '',
          tension: '',
          temperature: '',
          pouls: '',
          frequenceRespiratoire: ''
        });
        setSelectedPatient('');
        setSelectedPatientInfo(null);
        setSuccess('');
      }, 2000);

    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fonction pour la synchronisation (placeholder)
  const handleSyncConsultation = async () => {
    try {
      setSuccess('Synchronisation en cours...');
      await forceSync();
      setSuccess('Données synchronisées avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur de synchronisation');
      console.error('Erreur:', err);
    }
  };

  // Gestion de l'assistant IA
  const handleAISubmit = () => {
    if (!aiInput.trim()) return;

    const newMessage = { role: 'user', content: aiInput };
    setAiMessages([...aiMessages, newMessage]);

    // Simulation d'une réponse IA basée sur les données de consultation
    setTimeout(() => {
      let response = '';
      const input = aiInput.toLowerCase();
      
      if (input.includes('fièvre') || input.includes('température')) {
        response = 'Pour une fièvre, vérifiez : température corporelle, signes d\'infection, hydratation. Protocole suggéré : paracétamol 500mg toutes les 6h si T° > 38.5°C. Pensez aux examens complémentaires si fièvre persistante.';
      } else if (input.includes('tension') || input.includes('hypertension')) {
        response = 'Hypertension artérielle : vérifiez les antécédents familiaux, l\'IMC, les habitudes alimentaires. Valeurs normales : < 140/90 mmHg. Recommandez une surveillance régulière et adaptez le traitement si nécessaire.';
      } else if (input.includes('enfant') || input.includes('pédiatrique')) {
        response = 'Pour un patient pédiatrique : adaptez les doses selon le poids (mg/kg), vérifiez le carnet de vaccination, surveillez la croissance. Attention aux contre-indications spécifiques à l\'âge.';
      } else if (input.includes('diagnostic')) {
        response = `Basé sur les symptômes saisis (${consultationData.symptomes || 'non spécifiés'}), considérez le diagnostic différentiel. Avez-vous pensé aux examens complémentaires ?`;
      } else {
        response = 'Pouvez-vous me donner plus de détails sur les symptômes ? Je peux vous aider avec le diagnostic différentiel et les protocoles de traitement.';
      }
      
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }, 1000);

    setAiInput('');
  };

  // Calculer l'IMC si poids et taille sont disponibles
  const calculateBMI = () => {
    const weight = parseFloat(consultationData.poids);
    const height = parseFloat(consultationData.taille) / 100; // conversion cm en m
    
    if (weight && height) {
      const bmi = weight / (height * height);
      return bmi.toFixed(1);
    }
    return null;
  };

  // Mise à jour de l'affichage de l'état de la connexion
  const renderConnectionStatus = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">État de la connexion</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 ${isOnline ? 'bg-green-500' : 'bg-red-500'} rounded-full`}></div>
          <span className="text-sm">{isOnline ? 'Connecté' : 'Hors ligne'}</span>
        </div>
        <div className="text-xs text-slate-600 mt-2">
          <div>Status: {syncStatus}</div>
          {pendingChanges.total > 0 && (
            <div>En attente: {pendingChanges.total} document(s)</div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Nouvelle consultation</h1>
          <p className="text-slate-600">Saisie des informations de consultation</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadPatients} 
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSaveConsultation}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </Button>
          <Button onClick={handleSyncConsultation}>
            <Send className="w-4 h-4 mr-2" />
            Synchroniser
          </Button>
        </div>
      </div>

      {/* Messages d'alerte */}
      {(error || patientsError) && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            {error || patientsError}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sélection du patient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Patient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="patient">Sélectionner un patient *</Label>
                <Select value={selectedPatient} onValueChange={handlePatientSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Chargement..." : "Rechercher un patient..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id.toString()}>
                        {patient.nom} {patient.prenom} ({patient.numeroPatient})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedPatientInfo && (
                <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                  <h4 className="font-semibold text-blue-900">
                    {selectedPatientInfo.nom} {selectedPatientInfo.prenom}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                    <div>N° Patient: {selectedPatientInfo.numeroPatient}</div>
                    <div>Âge: {new Date().getFullYear() - new Date(selectedPatientInfo.dateNaissance).getFullYear()} ans</div>
                    <div>Sexe: {selectedPatientInfo.sexe}</div>
                    <div>Téléphone: {selectedPatientInfo.telephone}</div>
                    <div className="col-span-2">Dernière visite: {selectedPatientInfo.lastVisit || 'Aucune'}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date consultation</Label>
                  <Input
                    id="date"
                    type="date"
                    value={consultationData.date}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="medecin">Médecin</Label>
                  <Input
                    id="medecin"
                    placeholder="Nom du médecin"
                    value={consultationData.medecin}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, medecin: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Motif et symptômes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5" />
                Motif de consultation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="motif">Motif principal *</Label>
                <Input
                  id="motif"
                  placeholder="Ex: Fièvre, maux de tête, contrôle..."
                  value={consultationData.motif}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, motif: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="symptomes">Symptômes détaillés</Label>
                <Textarea
                  id="symptomes"
                  placeholder="Décrivez les symptômes du patient..."
                  rows={4}
                  value={consultationData.symptomes}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, symptomes: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Constantes vitales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Constantes vitales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="poids">Poids (kg)</Label>
                  <Input
                    id="poids"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 70.5"
                    value={consultationData.poids}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, poids: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="taille">Taille (cm)</Label>
                  <Input
                    id="taille"
                    type="number"
                    placeholder="Ex: 170"
                    value={consultationData.taille}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, taille: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="temperature">Température (°C)</Label>
                  <Input
                    id="temperature"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 37.2"
                    value={consultationData.temperature}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, temperature: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tension">Tension (mmHg)</Label>
                  <Input
                    id="tension"
                    placeholder="Ex: 120/80"
                    value={consultationData.tension}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, tension: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="pouls">Pouls (bpm)</Label>
                  <Input
                    id="pouls"
                    type="number"
                    placeholder="Ex: 72"
                    value={consultationData.pouls}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, pouls: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fr">Fréq. resp. (/min)</Label>
                  <Input
                    id="fr"
                    type="number"
                    placeholder="Ex: 18"
                    value={consultationData.frequenceRespiratoire}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, frequenceRespiratoire: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Calcul automatique de l'IMC */}
              {calculateBMI() && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium">
                    IMC calculé: {calculateBMI()} kg/m²
                    <span className="ml-2 text-xs text-slate-600">
                      {(() => {
                        const bmi = parseFloat(calculateBMI());
                        if (bmi < 18.5) return '(Insuffisance pondérale)';
                        if (bmi < 25) return '(Poids normal)';
                        if (bmi < 30) return '(Surpoids)';
                        return '(Obésité)';
                      })()}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Diagnostic et traitement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Diagnostic et traitement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="diagnostic">Diagnostic *</Label>
                <Textarea
                  id="diagnostic"
                  placeholder="Diagnostic principal et différentiel..."
                  rows={3}
                  value={consultationData.diagnostic}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, diagnostic: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="traitement">Traitement prescrit</Label>
                <Textarea
                  id="traitement"
                  placeholder="Médicaments, posologie, durée..."
                  rows={4}
                  value={consultationData.traitement}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, traitement: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="duree">Durée consultation (min)</Label>
                  <Input
                    id="duree"
                    type="number"
                    placeholder="Ex: 30"
                    value={consultationData.duree}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, duree: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="rdv">Prochain RDV</Label>
                  <Input
                    id="rdv"
                    type="date"
                    value={consultationData.prochainRdv}
                    onChange={(e) => setConsultationData(prev => ({ ...prev, prochainRdv: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select value={consultationData.status} onValueChange={(value) => setConsultationData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terminée">Terminée</SelectItem>
                      <SelectItem value="en_cours">En cours</SelectItem>
                      <SelectItem value="programmée">Programmée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="observations">Observations</Label>
                <Textarea
                  id="observations"
                  placeholder="Notes additionnelles..."
                  rows={3}
                  value={consultationData.observations}
                  onChange={(e) => setConsultationData(prev => ({ ...prev, observations: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assistant IA */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Assistant IA
                </div>
                <Badge variant="secondary" className="text-xs">
                  Offline
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages de l'IA */}
              <div className="h-80 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-lg">
                {aiMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white ml-4'
                        : 'bg-white text-slate-900 mr-4 border'
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>

              {/* Input pour l'IA */}
              <div className="flex gap-2">
                <Input
                  placeholder="Posez votre question..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAISubmit()}
                />
                <Button size="sm" onClick={handleAISubmit}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Suggestions rapides */}
              <div className="space-y-2">
                <p className="text-xs text-slate-600">Suggestions :</p>
                <div className="flex flex-wrap gap-1">
                  {[
                    'Diagnostic fièvre',
                    'Protocole HTA',
                    'Posologie enfant',
                    'Urgence vitale',
                    'Examens complémentaires'
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setAiInput(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raccourcis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                Planifier suivi
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Search className="w-4 h-4 mr-2" />
                Rechercher patient
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter note
              </Button>
            </CardContent>
          </Card>

          {/* Informations sur la connexion */}
          {renderConnectionStatus()}
        </div>
      </div>
    </div>
  );
}