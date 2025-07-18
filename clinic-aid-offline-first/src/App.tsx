import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useState, useEffect } from "react";
// Import AuthProvider from its module (adjust the path as needed)
import { AuthProvider } from "./hooks/useAuthContext";

// Layout
import AppLayout from "./components/layout/AppLayout";

// Pages
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Consultations from "./pages/Consultations";
import Vaccinations from "./pages/Vaccinations";
import Assistant from "./pages/Assistant";
import Sync from "./pages/Sync";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

// Service PouchDB
import pouchService from "./services/pouchService";

// Components UI
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wifi, 
  WifiOff, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Trash2
} from "lucide-react";
import ConsultationsList from "./pages/ConsultationsList";

const queryClient = new QueryClient();

// Types pour TypeScript
interface ConnectionStatus {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline' | 'pending';
  pendingChanges: {
    patients: number;
    consultations: number;
    antecedents: number;
    vaccinations: number;
    notes: number;
    total: number;
  };
  lastSync: string | null;
}

interface PouchEvent {
  type: string;
  [key: string]: unknown;
}

// Hook pour vérifier l'authentification
function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ role?: string } | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const authData = localStorage.getItem('clinicLiteAuth');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          // Vérifier si le token n'est pas expiré (simple vérification)
          const tokenAge = Date.now() - new Date(parsed.timestamp).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 heures
          
          if (tokenAge < maxAge) {
            setIsAuthenticated(true);
            setUser(parsed.user || null);
            return;
          }
        } catch (error) {
          console.error('Erreur parsing auth data:', error);
        }
      }
      setIsAuthenticated(false);
      setUser(null);
    };

    checkAuth();
  }, []);

  return { isAuthenticated, user };
}

// Hook pour gérer PouchDB et la synchronisation
function usePouchDB() {
  const [appInitialized, setAppInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    pendingChanges: {
      patients: 0,
      consultations: 0,
      antecedents: 0,
      vaccinations: 0,
      notes: 0,
      total: 0
    },
    lastSync: null
  });

  // Ajouter des écouteurs d'événements directs pour online/offline
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser detected online");
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: true,
        syncStatus: prev.syncStatus === 'offline' ? 'syncing' : prev.syncStatus
      }));
    };

    const handleOffline = () => {
      console.log("Browser detected offline");
      setConnectionStatus(prev => ({
        ...prev,
        isOnline: false,
        syncStatus: 'offline'
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handlePouchEvent = (event: PouchEvent) => {
    console.log("PouchDB event type:", event.type);
    switch (event.type) {
      case 'online':
        setConnectionStatus(prev => ({
          ...prev,
          isOnline: true,
          syncStatus: 'syncing'
        }));
        break;
        
      case 'offline':
        setConnectionStatus(prev => ({
          ...prev,
          isOnline: false,
          syncStatus: 'offline'
        }));
        break;
        
      case 'sync_active':
        setConnectionStatus(prev => ({
          ...prev,
          syncStatus: 'syncing'
        }));
        break;
        
      case 'sync_complete':
        setConnectionStatus(prev => ({
          ...prev,
          syncStatus: 'synced',
          lastSync: new Date().toISOString()
        }));
        updatePendingChanges();
        break;
        
      case 'sync_error':
        setConnectionStatus(prev => ({
          ...prev,
          syncStatus: 'error'
        }));
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
        updatePendingChanges();
        break;
        
      // Événements existants
      case 'patient_created':
      case 'patient_updated':
      case 'patient_deleted':
      case 'consultation_created':
      case 'consultation_updated':
      case 'consultation_deleted':
        updatePendingChanges();
        break;
    }
  };

  const updatePendingChanges = async () => {
    try {
      const pending = {
        patients: 0,
        consultations: 0,
        antecedents: 0,
        vaccinations: 0,
        notes: 0,
        total: 0
      };

      // Récupérer les documents en attente par type
      const pendingDocs = await pouchService.localDB.find({
        selector: {
          syncStatus: 'pending'
        }
      });

      pendingDocs.docs.forEach(doc => {
        switch (doc.type) {
          case 'patient':
            pending.patients++;
            break;
          case 'consultation':
            pending.consultations++;
            break;
          case 'antecedent':
            pending.antecedents++;
            break;
          case 'vaccination':
            pending.vaccinations++;
            break;
          case 'note':
            pending.notes++;
            break;
        }
      });

      pending.total = pendingDocs.docs.length;

      setConnectionStatus(prev => ({
        ...prev,
        pendingChanges: pending
      }));
    } catch (error) {
      console.error('Erreur mise à jour stats:', error);
    }
  };

  const forceSync = async () => {
    console.log('Force sync lancee');
    try {
      setConnectionStatus(prev => ({
        ...prev,
        syncStatus: 'syncing'
      }));
      await pouchService.forceSyncWithBackend();
    } catch (error) {
      console.error('Erreur synchronisation forcée:', error);
      setConnectionStatus(prev => ({
        ...prev,
        syncStatus: 'error'
      }));
    }
  };

  const forceFullSync = async () => {
    console.log('Force full sync demandée');
    try {
      setConnectionStatus(prev => ({
        ...prev,
        syncStatus: 'syncing'
      }));
      
      const result = await pouchService.forceFullSync();
      
      if (result) {
        // Mettre à jour les stats après la synchronisation complète
        setConnectionStatus(prev => ({
          ...prev,
          syncStatus: 'synced',
          lastSync: new Date().toISOString()
        }));
        updatePendingChanges();
      }
    } catch (error) {
      console.error('Erreur synchronisation complète forcée:', error);
      setConnectionStatus(prev => ({
        ...prev,
        syncStatus: 'error'
      }));
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {

        
        // PouchDB est automatiquement initialisé lors de l'import
        console.log('Initialisation de PouchDB...');
        
        // Écouter les changements de statut
        const unsubscribe = pouchService.addChangeListener(handlePouchEvent);
        
        // Mettre à jour les statistiques initiales
        await updatePendingChanges();
        
        setAppInitialized(true);
        console.log('Application initialisée avec succès');
        
        // Cleanup function
        return () => {
          unsubscribe();
        };
        
      } catch (error) {
        console.error('Erreur initialisation application:', error);
        setInitError(error instanceof Error ? error.message : 'Erreur inconnue');
      }
    };

    initializeApp();
  }, []);

  return {
    appInitialized,
    initError,
    connectionStatus,
    forceSync,
    forceFullSync
  };
}

// Composant pour la barre de statut de synchronisation
function SyncStatusBar({ connectionStatus, onForceSync, onForceFullSync }: { 
  connectionStatus: ConnectionStatus; 
  onForceSync: () => void;
  onForceFullSync: () => void;
}) {
  const getSyncStatusBadge = () => {
    switch (connectionStatus.syncStatus) {
      case 'syncing':
        return (
          <Badge variant="secondary" className="text-xs">
            <Loader2 className="w-2 h-3 mr-1 animate-spin" />
            Synchronisation...
          </Badge>
        );
      case 'synced':
        return (
          <Badge variant="default" className="text-xs bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synchronisé
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erreur sync
          </Badge>
        );
      case 'offline':
        return (
          <Badge variant="secondary" className="text-xs">
            <WifiOff className="w-3 h-3 mr-1" />
            Hors ligne
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="text-xs">
            <Database className="w-3 h-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleForceFullSync = () => {
    if (confirm("ATTENTION: Cette action va vider la base de données locale et recharger toutes les données depuis le serveur. Les données non synchronisées seront perdues. Voulez-vous continuer?")) {
      onForceFullSync();
    }
  };

  return (
    <>
      {/* Version desktop */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 lg:block hidden">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4 overflow-x-auto">
            {/* Status de connexion */}
            <div className="flex items-center gap-1">
              {connectionStatus.isOnline ? (
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
            </div>

            {/* Badge de statut de synchronisation */}
            {getSyncStatusBadge()}

            {/* Badges des changements en attente */}
            {connectionStatus.pendingChanges.total > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <Database className="w-3 h-3 mr-1" />
                  {connectionStatus.pendingChanges.total} en attente
                </Badge>
                {/* Détails des changements en attente */}
                <div className="flex gap-1">
                  {connectionStatus.pendingChanges.patients > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Patients: {connectionStatus.pendingChanges.patients}
                    </Badge>
                  )}
                  {connectionStatus.pendingChanges.consultations > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Consultations: {connectionStatus.pendingChanges.consultations}
                    </Badge>
                  )}
                  {connectionStatus.pendingChanges.antecedents > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Antécédents: {connectionStatus.pendingChanges.antecedents}
                    </Badge>
                  )}
                  {connectionStatus.pendingChanges.vaccinations > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Vaccinations: {connectionStatus.pendingChanges.vaccinations}
                    </Badge>
                  )}
                  {connectionStatus.pendingChanges.notes > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Notes: {connectionStatus.pendingChanges.notes}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Dernière synchronisation */}
            {connectionStatus.lastSync && (
              <span className="text-xs text-slate-500">
                Dernière sync: {new Date(connectionStatus.lastSync).toLocaleString()}
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {/* Bouton de synchronisation forcée */}
            <Button
              variant="outline"
              size="sm"
              onClick={onForceSync}
              disabled={!connectionStatus.isOnline || connectionStatus.syncStatus === 'syncing'}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${connectionStatus.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Sync
            </Button>
            
            {/* Bouton de synchronisation complète */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleForceFullSync}
              disabled={!connectionStatus.isOnline || connectionStatus.syncStatus === 'syncing'}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Reset & Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Version mobile - plus compacte */}
      <div className="bg-white border-b border-slate-200 px-3 py-1 lg:hidden flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connectionStatus.isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
          {getSyncStatusBadge()}
          {connectionStatus.pendingChanges.total > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Database className="w-3 h-3 mr-1" />
              {connectionStatus.pendingChanges.total}
            </Badge>
          )}
        </div>
        
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onForceSync}
            disabled={!connectionStatus.isOnline || connectionStatus.syncStatus === 'syncing'}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${connectionStatus.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleForceFullSync}
            disabled={!connectionStatus.isOnline || connectionStatus.syncStatus === 'syncing'}
            className="h-8 w-8 p-0 text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}

// Composant pour protéger les routes
function ProtectedRoute({ children, allowedRoles = [] }: { 
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-lg font-semibold mb-2">Vérification de l'authentification...</h2>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

const App = () => {
  const { appInitialized, initError, connectionStatus, forceSync, forceFullSync } = usePouchDB();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <div className="min-h-screen">
              <Routes>
                {/* Routes publiques */}
                <Route path="/login" element={<Login />} />
                
                {/* Routes protégées */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout>
                        <div className="w-full">
                          <SyncStatusBar 
                            connectionStatus={connectionStatus} 
                            onForceSync={forceSync}
                            onForceFullSync={forceFullSync}
                          />
                          <div className="py-4">
                            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                              <Outlet />
                            </div>
                          </div>
                        </div>
                      </AppLayout>
                    </ProtectedRoute>
                  }
                >
                  <Route index element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="patients" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin', 'infirmier']}>
                      <Patients />
                    </ProtectedRoute>
                  } />
                  <Route path="patients/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin', 'infirmier']}>
                      <PatientDetail />
                    </ProtectedRoute>
                  } />
                  <Route path="consultations" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin']}>
                      <Consultations />
                    </ProtectedRoute>
                  } />
                  <Route path="consultations/new" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin']}>
                      <Consultations />
                    </ProtectedRoute>
                  } />
                  <Route path="Listconsultations" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin']}>
                      <ConsultationsList />
                    </ProtectedRoute>
                  } />
                  <Route path="vaccinations" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin', 'infirmier']}>
                      <Vaccinations />
                    </ProtectedRoute>
                  } />
                  <Route path="assistant" element={
                    <ProtectedRoute allowedRoles={['admin', 'medecin', 'infirmier']}>
                      <Assistant />
                    </ProtectedRoute>
                  } />
                  <Route path="settings" element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                </Route>

                {/* Route d'erreur 403 */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                
                {/* Route 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;