
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { 
  Users, 
  Calendar, 
  AlertTriangle, 
  TrendingUp, 
  Syringe, 
  Heart,
  Activity,
  ClipboardList,
  Bell,
  RefreshCw
} from 'lucide-react';

export default function Dashboard() {
  const stats = [
    {
      title: "Patients vus aujourd'hui",
      value: "12",
      change: "+3 depuis hier",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Consultations en cours",
      value: "8",
      change: "4 en attente",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Vaccinations prévues",
      value: "15",
      change: "Cette semaine",
      icon: Syringe,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Suivi patients",
      value: "23",
      change: "Traitements actifs",
      icon: Heart,
      color: "text-red-600",
      bgColor: "bg-red-50"
    }
  ];

  const weeklyData = [
    { name: 'Lun', consultations: 8, vaccins: 3 },
    { name: 'Mar', consultations: 12, vaccins: 5 },
    { name: 'Mer', consultations: 6, vaccins: 2 },
    { name: 'Jeu', consultations: 15, vaccins: 7 },
    { name: 'Ven', consultations: 10, vaccins: 4 },
    { name: 'Sam', consultations: 4, vaccins: 1 },
    { name: 'Dim', consultations: 3, vaccins: 0 },
  ];

  const diagnosisData = [
    { name: 'Paludisme', value: 35, color: '#ef4444' },
    { name: 'Grippe', value: 25, color: '#3b82f6' },
    { name: 'Diarrhée', value: 20, color: '#10b981' },
    { name: 'Hypertension', value: 15, color: '#f59e0b' },
    { name: 'Autres', value: 5, color: '#6b7280' },
  ];

  const alerts = [
    { type: 'error', title: 'Stock faible', message: 'Paracétamol - 12 comprimés restants', priority: 'high' },
    { type: 'warning', title: 'Rappel vaccination', message: '3 enfants à vacciner cette semaine', priority: 'medium' },
    { type: 'info', title: 'Synchronisation', message: '47 dossiers en attente de synchronisation', priority: 'low' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Vue d'ensemble de votre centre de santé</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            <RefreshCw className="w-3 h-3 mr-1" />
            Dernière sync: 14:32
          </Badge>
          <Button size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Synchroniser
          </Button>
        </div>
      </div>

      {/* Alertes critiques */}
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <Alert key={index} className={`border-l-4 ${
            alert.priority === 'high' ? 'border-l-red-500 bg-red-50' :
            alert.priority === 'medium' ? 'border-l-amber-500 bg-amber-50' :
            'border-l-blue-500 bg-blue-50'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${
              alert.priority === 'high' ? 'text-red-600' :
              alert.priority === 'medium' ? 'text-amber-600' :
              'text-blue-600'
            }`} />
            <AlertDescription>
              <span className="font-medium">{alert.title}:</span> {alert.message}
            </AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <p className="text-xs text-slate-500 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activité hebdomadaire */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Activité hebdomadaire
            </CardTitle>
            <CardDescription>
              Consultations et vaccinations des 7 derniers jours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="consultations" fill="#3b82f6" name="Consultations" />
                <Bar dataKey="vaccins" fill="#10b981" name="Vaccinations" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition des diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-600" />
              Diagnostics principaux
            </CardTitle>
            <CardDescription>
              Répartition des pathologies ce mois-ci
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={diagnosisData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {diagnosisData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accès direct aux fonctions principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="w-6 h-6" />
              Nouveau patient
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Activity className="w-6 h-6" />
              Consultation
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Syringe className="w-6 h-6" />
              Vaccination
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Calendar className="w-6 h-6" />
              Rendez-vous
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
