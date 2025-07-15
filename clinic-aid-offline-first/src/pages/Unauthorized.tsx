import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="text-center space-y-6 p-8">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Accès non autorisé</h1>
        <p className="text-slate-600 max-w-md">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate(-1)}>
            Retour
          </Button>
          <Button variant="outline" onClick={() => navigate('/')}>
            Accueil
          </Button>
        </div>
      </div>
    </div>
  );
}