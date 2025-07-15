
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Wifi, 
  WifiOff,
  Server,
  Database,
  Upload,
  Download,
  Pause,
  Play,
  Trash2,
  Eye
} from 'lucide-react';

interface SyncItem {
  id: string;
  type: 'patient' | 'consultation' | 'vaccination' | 'note';
  name: string;
  action: 'create' | 'update' | 'delete';
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  lastModified: Date;
  size: string;
  error?: string;
}

interface SyncLog {
  id: string;
  timestamp: Date;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  details?: string;
}

export default function Sync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(new Date(2024, 0, 15, 14, 32));
  const [autoSync, setAutoSync] = useState(true);

  const [pendingItems] = useState<SyncItem[]>([
    {
      id: '1',
      type: 'patient',
      name: 'Nouveau patient - Kone Salimata',
      action: 'create',
      status: 'pending',
      lastModified: new Date(2024, 0, 15, 10, 30),
      size: '2.4 KB'
    },
    {
      id: '2',
      type: 'consultation',
      name: 'Consultation - Kouassi Marie',
      action: 'update',
      status: 'pending',
      lastModified: new Date(2024, 0, 15, 11, 45),
      size: '5.7 KB'
    },
    {
      id: '3',
      type: 'vaccination',
      name: 'Vaccination COVID-19 - Traore Ibrahim',
      action: 'create',
      status: 'failed',
      lastModified: new Date(2024, 0, 15, 9, 15),
      size: '1.2 KB',
      error: 'Erreur de connexion serveur'
    },
    {
      id: '4',
      type: 'note',
      name: 'Note clinique - Ouattara Sekou',
      action: 'create',
      status: 'completed',
      lastModified: new Date(2024, 0, 15, 8, 20),
      size: '0.8 KB'
    }
  ]);

  const [syncLogs] = useState<SyncLog[]>([
    {
      id: '1',
      timestamp: new Date(2024, 0, 15, 14, 32),
      type: 'success',
      message: 'Synchronisation terminée avec succès',
      details: '12 éléments synchronisés, 0 erreur'
    },
    {
      id: '2',
      timestamp: new Date(2024, 0, 15, 12, 15),
      type: 'error',
      message: 'Échec de synchronisation',
      details: 'Impossible de joindre le serveur - Timeout après 30s'
    },
    {
      id: '3',
      timestamp: new Date(2024, 0, 15, 10, 45),
      type: 'warning',
      message: 'Synchronisation partielle',
      details: '8 éléments synchronisés, 2 échecs'
    },
    {
      id: '4',
      timestamp: new Date(2024, 0, 15, 9, 30),
      type: 'info',
      message: 'Démarrage de la synchronisation automatique',
      details: 'Mode auto-sync activé'
    }
  ]);

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

  const handleStartSync = async () => {
    if (!isOnline) {
      alert('Connexion Internet requise pour la synchronisation');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    // Simulation du processus de synchronisation
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setLastSyncTime(new Date());
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const handleCancelSync = () => {
    setIsSyncing(false);
    setSyncProgress(0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'syncing':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="text-xs">Terminé</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-xs">Échec</Badge>;
      case 'syncing':
        return <Badge variant="secondary" className="text-xs">En cours</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'patient':
        return '👤';
      case 'consultation':
        return '🩺';
      case 'vaccination':
        return '💉';
      case 'note':
        return '📝';
      default:
        return '📄';
    }
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-blue-600 flex-shrink-0" />;
    }
  };

  const pendingCount = pendingItems.filter(item => item.status === 'pending').length;
  const failedCount = pendingItems.filter(item => item.status === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Synchronisation</h1>
          <p className="text-slate-600">Gestion de la synchronisation des données</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
            isOnline ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'En ligne' : 'Hors ligne'}
          </div>
          
          {!isSyncing ? (
            <Button onClick={handleStartSync} disabled={!isOnline || pendingCount === 0}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Synchroniser maintenant
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleCancelSync}>
              <Pause className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* Statut général */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">En attente</p>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Échecs</p>
                <p className="text-2xl font-bold text-slate-900">{failedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Server className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Serveur</p>
                <p className="text-sm font-medium text-green-600">
                  {isOnline ? 'Accessible' : 'Inaccessible'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Dernière sync</p>
                <p className="text-sm font-medium text-slate-900">
                  {lastSyncTime.toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre de progression */}
      {isSyncing && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Synchronisation en cours...</span>
                <span className="text-sm text-slate-500">{syncProgress}%</span>
              </div>
              <Progress value={syncProgress} className="w-full" />
              <p className="text-xs text-slate-500">
                Synchronisation des données avec le serveur central
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertes */}
      {!isOnline && (
        <Alert className="border-amber-200 bg-amber-50">
          <WifiOff className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Connexion Internet indisponible. Les données seront synchronisées dès le retour de la connexion.
          </AlertDescription>
        </Alert>
      )}

      {failedCount > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {failedCount} élément(s) n'ont pas pu être synchronisés. Vérifiez les détails ci-dessous.
          </AlertDescription>
        </Alert>
      )}

      {/* Onglets */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Éléments en attente ({pendingCount + failedCount})
          </TabsTrigger>
          <TabsTrigger value="logs">Journaux</TabsTrigger>
          <TabsTrigger value="settings">Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Éléments à synchroniser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-slate-50">
                    <div className="text-xl">{getTypeIcon(item.type)}</div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-slate-900">{item.name}</h4>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>Action: {item.action === 'create' ? 'Création' : 
                               item.action === 'update' ? 'Modification' : 'Suppression'}</span>
                        <span>Taille: {item.size}</span>
                        <span>Modifié: {item.lastModified.toLocaleString('fr-FR')}</span>
                      </div>
                      {item.error && (
                        <p className="text-sm text-red-600 mt-1">Erreur: {item.error}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Journaux de synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {syncLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      {getLogIcon(log.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-slate-900">{log.message}</h4>
                          <span className="text-xs text-slate-500">
                            {log.timestamp.toLocaleString('fr-FR')}
                          </span>
                        </div>
                        {log.details && (
                          <p className="text-sm text-slate-600">{log.details}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Paramètres de synchronisation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-slate-900">Synchronisation automatique</h4>
                  <p className="text-sm text-slate-600">
                    Synchroniser automatiquement quand une connexion est disponible
                  </p>
                </div>
                <Button
                  variant={autoSync ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAutoSync(!autoSync)}
                >
                  {autoSync ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                  {autoSync ? 'Activé' : 'Désactivé'}
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-slate-900">Actions de maintenance</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Forcer téléchargement
                  </Button>
                  <Button variant="outline" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Forcer envoi
                  </Button>
                  <Button variant="outline" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Vider le cache
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h4 className="font-medium text-slate-900 mb-2">Configuration serveur</h4>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>URL du serveur:</span>
                    <span className="font-mono">https://api.cliniclite.health</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dernière vérification:</span>
                    <span>{new Date().toLocaleTimeString('fr-FR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statut:</span>
                    <span className={isOnline ? 'text-green-600' : 'text-red-600'}>
                      {isOnline ? 'Connecté' : 'Déconnecté'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
