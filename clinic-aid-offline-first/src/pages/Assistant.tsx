import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  History, 
  Search,
  BookOpen,
  MessageSquare,
  AlertTriangle,
  Heart,
  Activity,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle
} from 'lucide-react';

// TinyLlama integration avec prompts simplifiés
const useTinyLlamaIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modelStatus, setModelStatus] = useState('disconnected');

  const testOllamaConnection = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        const hasTinyLlama = data.models?.some(model => model.name.includes('tinyllama'));
        return hasTinyLlama;
      }
      return false;
    } catch (error) {
      console.error('Ollama connection failed:', error);
      return false;
    }
  };

  const generateTinyLlamaResponse = async (userMessage) => {
    if (!isConnected) {
      throw new Error('TinyLlama not connected');
    }

    
    const prompt = `You are a medical assistant. Answer this medical question briefly: ${userMessage}`;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tinyllama',
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.8,
            max_tokens: 300,
            stop: ['\n\n']
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || 'No response generated';
    } catch (error) {
      console.error('TinyLlama generation error:', error);
      throw error;
    }
  };

  const connectToTinyLlama = async () => {
    setIsLoading(true);
    setModelStatus('connecting');

    try {
      const isAvailable = await testOllamaConnection();
      
      if (isAvailable) {
        setIsConnected(true);
        setModelStatus('connected');
      } else {
        setModelStatus('model-not-found');
        throw new Error('TinyLlama model not found in Ollama');
      }
    } catch (error) {
      console.error('Connection error:', error);
      setModelStatus('error');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isConnected,
    isLoading,
    modelStatus,
    connectToTinyLlama,
    generateTinyLlamaResponse
  };
};

// TinyLlama Status Component
const TinyLlamaStatusCard = ({ onConnect, isConnected, isLoading, modelStatus }) => {
  const getStatusMessage = () => {
    switch (modelStatus) {
      case 'connected':
        return 'TinyLlama connected and ready';
      case 'connecting':
        return 'Connecting to TinyLlama...';
      case 'model-not-found':
        return 'TinyLlama model not found in Ollama';
      case 'error':
        return 'Connection error - Check if Ollama is running';
      default:
        return 'TinyLlama disconnected';
    }
  };

  const getStatusColor = () => {
    switch (modelStatus) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'model-not-found':
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5" />
          TinyLlama Model
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${getStatusColor()}`}>
              {getStatusMessage()}
            </span>
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'}>
            {isConnected ? 'Active' : 'Inactive'}
          </Badge>
        </div>

        {!isConnected && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Make sure Ollama is running and TinyLlama model is installed:
              <code className="block mt-1 text-xs bg-gray-100 p-1 rounded">
                ollama pull tinyllama
              </code>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={onConnect}
          disabled={isLoading || isConnected}
          className="w-full"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Wifi className="w-4 h-4 mr-2" />
          )}
          {isConnected ? 'TinyLlama Connected' : 'Connect to TinyLlama'}
        </Button>

        {modelStatus === 'model-not-found' && (
          <div className="text-xs text-gray-600 space-y-1">
            <p>To install TinyLlama:</p>
            <code className="block bg-gray-100 p-2 rounded text-xs">
              ollama pull tinyllama
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'helpful' | 'not-helpful';
}

interface Conversation {
  id: string;
  title: string;
  date: Date;
  messages: Message[];
}

export default function MedicalAssistant() {
  const [currentInput, setCurrentInput] = useState('');
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const { 
    isConnected, 
    isLoading: isModelLoading, 
    modelStatus,
    connectToTinyLlama, 
    generateTinyLlamaResponse 
  } = useTinyLlamaIntegration();
  
  const [currentConversation, setCurrentConversation] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI medical assistant. I can help with medical questions and healthcare guidance. How can I assist you today?',
      timestamp: new Date(),
    }
  ]);

  const [conversationHistory] = useState<Conversation[]>([
    {
      id: '1',
      title: 'Child fever diagnosis',
      date: new Date(2024, 0, 15),
      messages: []
    },
    {
      id: '2',
      title: 'Hypertension protocol',
      date: new Date(2024, 0, 14),
      messages: []
    },
    {
      id: '3',
      title: 'Antibiotic dosage',
      date: new Date(2024, 0, 12),
      messages: []
    }
  ]);

  const quickPrompts = [
    {
      category: 'Diagnostics',
      icon: Search,
      prompts: [
        'What causes fever in children?',
        'Signs of respiratory infection?',
        'How to check blood pressure?',
        'Symptoms of dehydration?'
      ]
    },
    {
      category: 'Treatments',
      icon: Heart,
      prompts: [
        'Paracetamol dosage for kids?',
        'How to treat cough?',
        'Best antibiotics for infection?',
        'Treatment for hypertension?'
      ]
    },
    {
      category: 'Emergencies',
      icon: AlertTriangle,
      prompts: [
        'Signs of breathing problems?',
        'What is medical shock?',
        'When to go to hospital?',
        'How to help with seizures?'
      ]
    },
    {
      category: 'Prevention',
      icon: BookOpen,
      prompts: [
        'Vaccination schedule?',
        'How to prevent malaria?',
        'Healthy diet tips?',
        'Exercise recommendations?'
      ]
    }
  ];

  const handleSendMessage = async () => {
    if (!currentInput.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date()
    };

    setCurrentConversation(prev => [...prev, userMessage]);
    const messageToSend = currentInput;
    setCurrentInput('');
    setIsMessageLoading(true);

    try {
      let aiResponse = '';
      
      if (isConnected) {
        // Utiliser TinyLlama avec prompt simple
        aiResponse = await generateTinyLlamaResponse(messageToSend);
      } else {
        // Réponses de base sans TinyLlama
        const input = messageToSend.toLowerCase();
        
        if (input.includes('fever') || input.includes('temperature')) {
          aiResponse = `For fever management:

• Check temperature regularly
• Give paracetamol (15mg/kg every 6 hours)
• Ensure adequate fluids
• Monitor for warning signs
• Seek help if fever persists >2 days

Warning signs: difficulty breathing, stiff neck, severe headache, rash.

*Always consult healthcare professionals for proper diagnosis.*`;
        } else if (input.includes('pressure') || input.includes('hypertension')) {
          aiResponse = `For high blood pressure:

• Check BP regularly
• Reduce salt intake
• Exercise regularly
• Maintain healthy weight
• Take prescribed medications
• Monitor closely

Normal BP: <120/80 mmHg
High BP: >140/90 mmHg

*Consult your doctor for personalized treatment.*`;
        } else if (input.includes('cough') || input.includes('respiratory')) {
          aiResponse = `For cough and respiratory symptoms:

• Stay hydrated
• Use honey for cough (if >1 year old)
• Humidify air
• Rest well
• Avoid irritants

See doctor if: fever, breathing difficulty, blood in cough, symptoms worsen.

*Medical evaluation needed for persistent symptoms.*`;
        } else {
          aiResponse = `I can help with medical questions about:

• Fever and temperature
• Blood pressure
• Cough and breathing
• Medication dosages
• When to seek medical care

${!isConnected ? '⚠️ *TinyLlama not connected - Using basic responses*' : ''}

Please ask specific medical questions for better assistance.

*Always consult healthcare professionals for medical advice.*`;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.trim(),
        timestamp: new Date()
      };

      setCurrentConversation(prev => [...prev, assistantMessage]);
      
    } catch (error) {
      console.error('Message generation error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}. Please check TinyLlama connection and try again.`,
        timestamp: new Date()
      };
      
      setCurrentConversation(prev => [...prev, errorMessage]);
    } finally {
      setIsMessageLoading(false);
    }
  };

  const handleFeedback = (messageId: string, feedback: 'helpful' | 'not-helpful') => {
    setCurrentConversation(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, feedback } : msg
      )
    );
  };

  const startNewConversation = () => {
    setCurrentConversation([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'New conversation started. How can I help you with your medical questions?',
        timestamp: new Date(),
      }
    ]);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="w-7 h-7 text-purple-600" />
            Medical AI Assistant
          </h1>
          <p className="text-slate-600">Simple prompts for TinyLlama medical assistance</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isConnected ? "default" : "secondary"} className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            {isConnected ? 'TinyLlama Active' : 'Basic Mode'}
          </Badge>
          <Button variant="outline" size="sm" onClick={startNewConversation}>
            New Chat
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Tabs defaultValue="suggestions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="suggestions">Prompts</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="ai-config">Model</TabsTrigger>
            </TabsList>
            
            <TabsContent value="suggestions" className="space-y-4">
              {quickPrompts.map((category) => (
                <Card key={category.category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <category.icon className="w-4 h-4" />
                      {category.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {category.prompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-left h-auto p-2 text-xs text-wrap"
                        onClick={() => setCurrentInput(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Conversations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {conversationHistory.map((conv) => (
                    <Button
                      key={conv.id}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto p-2"
                    >
                      <div>
                        <p className="text-xs font-medium truncate">{conv.title}</p>
                        <p className="text-xs text-slate-500">
                          {conv.date.toLocaleDateString()}
                        </p>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-config" className="space-y-3">
              <TinyLlamaStatusCard
                onConnect={connectToTinyLlama}
                isConnected={isConnected}
                isLoading={isModelLoading}
                modelStatus={modelStatus}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Chat */}
        <div className="lg:col-span-3 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Medical Consultation
                {isConnected && <Badge variant="default" className="ml-2">TinyLlama</Badge>}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 px-6">
                <div className="space-y-4 py-4">
                  {currentConversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-900 border'
                        }`}
                      >
                        <div className="prose prose-sm max-w-none">
                          {message.role === 'assistant' ? (
                            <div className="whitespace-pre-line">{message.content}</div>
                          ) : (
                            <p>{message.content}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-opacity-20">
                          <span className="text-xs opacity-70">
                            {message.timestamp.toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          
                          {message.role === 'assistant' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-6 w-6 p-0 ${
                                  message.feedback === 'helpful' 
                                    ? 'text-green-600' 
                                    : 'text-slate-400 hover:text-green-600'
                                }`}
                                onClick={() => handleFeedback(message.id, 'helpful')}
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className={`h-6 w-6 p-0 ${
                                  message.feedback === 'not-helpful' 
                                    ? 'text-red-600' 
                                    : 'text-slate-400 hover:text-red-600'
                                }`}
                                onClick={() => handleFeedback(message.id, 'not-helpful')}
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isMessageLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 border p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
                          {isConnected ? 'TinyLlama is thinking...' : 'Processing your request...'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t p-6">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask your medical question..."
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isMessageLoading}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!currentInput.trim() || isMessageLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                
                <p className="text-xs text-slate-500 mt-2">
                  💡 {isConnected ? 'TinyLlama connected - Enhanced responses available' : 'Connect TinyLlama for AI-powered medical assistance'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}