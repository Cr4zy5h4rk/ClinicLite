import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Stethoscope, 
  Eye, 
  EyeOff, 
  WifiOff, 
  Wifi,
  Shield
} from 'lucide-react';
import pouchService from '@/services/pouchService';

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isOnline] = useState(navigator.onLine);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!isOnline) {
        // Authentification en ligne
        const response = await fetch('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Erreur de connexion');
        }

        // Stocker les credentials localement lors de la première connexion réussie
        if (rememberMe) {
          await pouchService.storeAuthCredentials({
            ...data.user,
            password: credentials.password // Nécessaire pour le hash local
          });
        }

        localStorage.setItem('clinicLiteAuth', JSON.stringify({
          user: {
            id: data.user.id,
            email: data.user.email,
            nom: `${data.user.nom} ${data.user.prenom}`,
            role: data.user.role
          },
          token: data.token,
          timestamp: new Date().toISOString()
        }));

      } else {
        // Authentification hors ligne
        const user = await pouchService.authenticateLocally(
          credentials.email,
          credentials.password
        );

        if (!user) {
          throw new Error('Authentification locale échouée');
        }

        // Stocker la session locale
        localStorage.setItem('clinicLiteAuth', JSON.stringify({
          user: {
            id: user.id,
            email: user.email,
            nom: `${user.nom} ${user.prenom}`,
            role: user.role
          },
          isOfflineAuth: true,
          timestamp: new Date().toISOString()
        }));
      }
      
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo et titre */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Stethoscope className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">ClinicLite</h1>
            <p className="text-slate-600">Système de gestion médicale offline-first</p>
          </div>
        </div>

        {/* Indicateur de connexion */}
        <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm ${
          isOnline ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {isOnline ? 'Mode en ligne - Synchronisation active' : 'Mode hors ligne - Données locales'}
        </div>

        {/* Formulaire de connexion */}
        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Connexion</CardTitle>
            <CardDescription className="text-center">
              Connectez-vous à votre compte ClinicLite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <Shield className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@exemple.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={isLoading}
                />
                <Label 
                  htmlFor="remember" 
                  className="text-sm font-normal cursor-pointer"
                >
                  Se souvenir de moi
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Connexion...
                  </div>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="text-center">
              <Button variant="link" className="text-sm text-slate-600">
                Mot de passe oublié ?
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informations de test */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-blue-900">Compte de démonstration</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Email:</strong> admin@clinique.com</p>
                <p><strong>Mot de passe:</strong> admin123</p>
              </div>
              <p className="text-xs text-blue-700">
                Utilisez ces identifiants pour tester l'application
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>ClinicLite v1.0 - Système médical pour centres de santé ruraux</p>
        </div>
      </div>
    </div>
  );
}
