
import { useState, useEffect, ReactNode } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuthContext';
import { 
  Home, 
  Users, 
  Stethoscope, 
  Syringe, 
  Brain, 
  RefreshCw, 
  Settings, 
  Menu,
  X,
  WifiOff,
  Wifi,
  LogOut,
  Trash2
} from 'lucide-react';
import pouchService from '@/services/pouchService';

interface AppLayoutProps {
  children?: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

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

  const menuItems = [
    { path: '/', icon: Home, label: 'Accueil', badge: null },
    { path: '/patients', icon: Users, label: 'Patients', badge: '24' },
    { path: '/consultations', icon: Stethoscope, label: 'Consultations', badge: null },
    { path: '/Listconsultations', icon: Stethoscope, label: 'Liste des consultations', badge: null },
    { path: '/vaccinations', icon: Syringe, label: 'Vaccinations', badge: '3' },
    { path: '/assistant', icon: Brain, label: 'Assistant IA', badge: null },
    { path: '/sync', icon: RefreshCw, label: 'Synchronisation', badge: isOnline ? '' : '!' },
    { path: '/settings', icon: Settings, label: 'Paramètres', badge: null },
  ];

  const isActivePath = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleForceFullSync = () => {
    if (confirm("ATTENTION: Cette action va vider la base de données locale et recharger toutes les données depuis le serveur. Les données non synchronisées seront perdues. Voulez-vous continuer?")) {
      pouchService.forceFullSync().then(() => {
        alert("Synchronisation complète terminée avec succès.");
      }).catch(error => {
        console.error("Erreur lors de la synchronisation complète:", error);
        alert("Erreur lors de la synchronisation complète. Consultez la console pour plus de détails.");
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-slate-200 pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-white" />
              </div>
              <h1 className="ml-3 text-xl font-bold text-slate-900">ClinicLite</h1>
            </div>
          </div>
          
          {/* Status de connexion */}
          <div className="px-4 mt-4">
            <div className={cn(
              "flex items-center px-3 py-2 rounded-lg text-sm",
              isOnline ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
            )}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-green-800">En ligne</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-600 mr-2" />
                  <span className="text-amber-800">Hors ligne</span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dernière sync: {lastSync.toLocaleTimeString()}
            </p>
          </div>

          <nav className="mt-5 flex-1 px-2 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActivePath(item.path)
                    ? "bg-blue-100 text-blue-900 border-r-2 border-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
                {item.badge && (
                  <Badge 
                    variant={item.badge === '!' ? "destructive" : "secondary"} 
                    className="ml-auto text-xs"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>

          {/* Boutons de déconnexion et sync forcée */}
          <div className="px-2 mt-auto pb-4 space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={handleForceFullSync}
              disabled={!isOnline}
            >
              <Trash2 className="mr-3 h-5 w-5" />
              Forcer synchronisation
            </Button>
            
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-slate-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h1 className="ml-3 text-lg font-bold text-slate-900">ClinicLite</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-white pt-16">
          <div className="px-4 py-4">
            <div className={cn(
              "flex items-center px-3 py-2 rounded-lg text-sm mb-4",
              isOnline ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"
            )}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4 text-green-600 mr-2" />
                  <span className="text-green-800">En ligne</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-amber-600 mr-2" />
                  <span className="text-amber-800">Hors ligne</span>
                </>
              )}
            </div>
          </div>
          
          <nav className="px-2 pt-2 pb-3 space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "group flex items-center px-2 py-3 text-base font-medium rounded-md",
                  isActivePath(item.path)
                    ? "bg-blue-100 text-blue-900"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon className="mr-3 h-6 w-6" />
                {item.label}
                {item.badge && (
                  <Badge 
                    variant={item.badge === '!' ? "destructive" : "secondary"} 
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
            
            {/* Bouton de synchronisation forcée mobile */}
            <Button 
              variant="outline" 
              className="w-full justify-start text-amber-600 hover:text-amber-700 hover:bg-amber-50 mt-4 px-2 py-3"
              onClick={handleForceFullSync}
              disabled={!isOnline}
            >
              <Trash2 className="mr-3 h-6 w-6" />
              Forcer synchronisation
            </Button>
            
            {/* Bouton de déconnexion mobile */}
            <Button 
              variant="ghost" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mt-4 px-2 py-3"
              onClick={handleLogout}
            >
              <LogOut className="mr-3 h-6 w-6" />
              Déconnexion
            </Button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col w-full">
        <main className="flex-1 pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
