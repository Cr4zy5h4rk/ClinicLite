import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings as SettingsIcon, 
  User, 
  Globe, 
  Database, 
  Download, 
  Upload, 
  Bell,
  Shield,
  Palette,
  Wifi,
  HardDrive,
  Save,
  RotateCcw,
  LogOut,
  Trash2,
  AlertTriangle
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    // Profil utilisateur
    profile: {
      nom: 'Dr. Konan',
      email: 'admin@cliniclite.com',
      telephone: '+225 07 12 34 56',
      specialite: 'Médecine générale',
      centresante: 'Centre de Santé Rural de Bouaké'
    },
    
    // Préférences générales
    general: {
      langue: 'fr',
      theme: 'light',
      timezone: 'Africa/Abidjan',
      dateFormat: 'dd/MM/yyyy',
      currency: 'XOF'
    },
    
    // Synchronisation
    sync: {
      autoSync: true,
      syncInterval: 30,
      wifiOnly: true,
      notifySync: true,
      backupCloud: false
    },
    
    // Notifications
    notifications: {
      rappelsVaccination: true,
      stockFaible: true,
      rendezVous: true,
      urgences: true,
      syncErrors: true
    },
    
    // Sécurité
    security: {
      autoLock: true,
      lockTimeout: 15,
      biometric: false,
      sessionTimeout: 60
    }
  });

  const [storageUsage] = useState({
    total: '2.1 GB',
    used: '847 MB',
    percentage: 40,
    breakdown: {
      patients: '234 MB',
      consultations: '456 MB',
      images: '123 MB',
      backups: '34 MB'
    }
  });

  const handleSave = () => {
    // Logique de sauvegarde des paramètres
    console.log('Paramètres sauvegardés:', settings);
  };

  const handleReset = () => {
    // Logique de réinitialisation
    console.log('Paramètres réinitialisés');
  };

  const handleExportData = () => {
    // Logique d'export des données
    console.log('Export des données en cours...');
  };

  const handleClearCache = () => {
    // Logique de vidage du cache
    console.log('Cache vidé');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-7 h-7" />
            Paramètres
          </h1>
          <p className="text-slate-600">Configuration de votre application ClinicLite</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="sync">Synchronisation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
          <TabsTrigger value="advanced">Avancé</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profil utilisateur
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom complet *</Label>
                  <Input
                    id="nom"
                    value={settings.profile.nom}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, nom: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.profile.email}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, email: e.target.value }
                    }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={settings.profile.telephone}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      profile: { ...prev.profile, telephone: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="specialite">Spécialité</Label>
                  <Select value={settings.profile.specialite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Médecine générale">Médecine générale</SelectItem>
                      <SelectItem value="Pédiatrie">Pédiatrie</SelectItem>
                      <SelectItem value="Gynécologie">Gynécologie</SelectItem>
                      <SelectItem value="Chirurgie">Chirurgie</SelectItem>
                      <SelectItem value="Infirmier">Infirmier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="centre">Centre de santé</Label>
                <Input
                  id="centre"
                  value={settings.profile.centresante}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    profile: { ...prev.profile, centresante: e.target.value }
                  }))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Préférences générales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="langue">Langue</Label>
                    <Select value={settings.general.langue}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="theme">Thème</Label>
                    <Select value={settings.general.theme}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Clair</SelectItem>
                        <SelectItem value="dark">Sombre</SelectItem>
                        <SelectItem value="auto">Automatique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Fuseau horaire</Label>
                    <Select value={settings.general.timezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Africa/Abidjan">Abidjan (GMT+0)</SelectItem>
                        <SelectItem value="Africa/Dakar">Dakar (GMT+0)</SelectItem>
                        <SelectItem value="Africa/Casablanca">Casablanca (GMT+1)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateformat">Format de date</Label>
                    <Select value={settings.general.dateFormat}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/MM/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-MM-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sync">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                Paramètres de synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Synchronisation automatique</Label>
                  <p className="text-sm text-slate-600">
                    Synchroniser automatiquement dès qu'une connexion est disponible
                  </p>
                </div>
                <Switch
                  checked={settings.sync.autoSync}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    sync: { ...prev.sync, autoSync: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Synchroniser uniquement en WiFi</Label>
                  <p className="text-sm text-slate-600">
                    Éviter l'utilisation des données mobiles
                  </p>
                </div>
                <Switch
                  checked={settings.sync.wifiOnly}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    sync: { ...prev.sync, wifiOnly: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notifications de synchronisation</Label>
                  <p className="text-sm text-slate-600">
                    Être notifié du statut de synchronisation
                  </p>
                </div>
                <Switch
                  checked={settings.sync.notifySync}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    sync: { ...prev.sync, notifySync: checked }
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="interval">Intervalle de synchronisation (minutes)</Label>
                <Select value={settings.sync.syncInterval.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="180">3 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries({
                rappelsVaccination: 'Rappels de vaccination',
                stockFaible: 'Stock de médicaments faible',
                rendezVous: 'Rendez-vous programmés',
                urgences: 'Alertes d\'urgence',
                syncErrors: 'Erreurs de synchronisation'
              }).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={settings.notifications[key as keyof typeof settings.notifications]}
                    onCheckedChange={(checked) => setSettings(prev => ({
                      ...prev,
                      notifications: { ...prev.notifications, [key]: checked }
                    }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Sécurité et confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Verrouillage automatique</Label>
                  <p className="text-sm text-slate-600">
                    Verrouiller l'application après inactivité
                  </p>
                </div>
                <Switch
                  checked={settings.security.autoLock}
                  onCheckedChange={(checked) => setSettings(prev => ({
                    ...prev,
                    security: { ...prev.security, autoLock: checked }
                  }))}
                />
              </div>

              <div>
                <Label htmlFor="lockTimeout">Délai de verrouillage (minutes)</Label>
                <Select value={settings.security.lockTimeout.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sessionTimeout">Durée de session (minutes)</Label>
                <Select value={settings.security.sessionTimeout.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 heure</SelectItem>
                    <SelectItem value="120">2 heures</SelectItem>
                    <SelectItem value="480">8 heures</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Toutes les données sont chiffrées localement et lors des transferts. 
                  Vos informations patient restent confidentielles.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <div className="space-y-6">
            {/* Stockage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5" />
                  Stockage et données
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilisation: {storageUsage.used} sur {storageUsage.total}</span>
                    <span>{storageUsage.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${storageUsage.percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(storageUsage.breakdown).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="capitalize">{key}:</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button variant="outline" size="sm" onClick={handleClearCache}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Vider le cache
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportData}>
                    <Download className="w-4 h-4 mr-2" />
                    Exporter données
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Importer données
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions système */}
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Zone de danger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Ces actions sont irréversibles. Assurez-vous d'avoir sauvegardé vos données.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-2">
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer toutes les données
                  </Button>
                  <Button variant="destructive" size="sm">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnecter et effacer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
