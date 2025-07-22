import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import axios from 'axios';
import { 
  MessageSquare, 
  Image, 
  Play, 
  Save, 
  Trash2, 
  Plus, 
  Upload,
  Clock,
  Smartphone,
  QrCode,
  Settings,
  Bot,
  Brain,
  Zap,
  FileText,
  Activity,
  Monitor,
  Eye,
  Filter,
  RefreshCw
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Custom Node Components
const MessageNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-blue-500 text-white p-4 rounded-lg shadow-md border-2 border-blue-600 min-w-[200px]">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare size={16} />
        <span className="font-semibold">Mensagem</span>
      </div>
      <div className="text-sm bg-blue-600 p-2 rounded">
        {data.message || 'Clique para editar mensagem...'}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const MediaNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-purple-500 text-white p-4 rounded-lg shadow-md border-2 border-purple-600 min-w-[200px]">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div className="flex items-center gap-2 mb-2">
        <Image size={16} />
        <span className="font-semibold">Mídia</span>
      </div>
      <div className="text-sm bg-purple-600 p-2 rounded">
        <div>Tipo: {data.mediaType || 'image'}</div>
        {data.caption && <div>Legenda: {data.caption}</div>}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const DelayNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-orange-500 text-white p-4 rounded-lg shadow-md border-2 border-orange-600 min-w-[200px]">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div className="flex items-center gap-2 mb-2">
        <Clock size={16} />
        <span className="font-semibold">Delay</span>
      </div>
      <div className="text-sm bg-orange-600 p-2 rounded">
        Aguardar: {data.seconds || 1} segundos
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const TriggerNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-green-500 text-white p-4 rounded-lg shadow-md border-2 border-green-600 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <Play size={16} />
        <span className="font-semibold">Trigger</span>
      </div>
      <div className="text-sm bg-green-600 p-2 rounded">
        Início do fluxo
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const AINode = ({ data, isConnectable }) => {
  return (
    <div className="bg-indigo-500 text-white p-4 rounded-lg shadow-md border-2 border-indigo-600 min-w-[200px]">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div className="flex items-center gap-2 mb-2">
        <Brain size={16} />
        <span className="font-semibold">IA Inteligente</span>
      </div>
      <div className="text-sm bg-indigo-600 p-2 rounded">
        <div>Modelo: {data.model || 'GPT-4'}</div>
        <div>Análise: {data.sentiment || 'Ativada'}</div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={isConnectable} />
    </div>
  );
};

const ConditionalNode = ({ data, isConnectable }) => {
  return (
    <div className="bg-yellow-500 text-white p-4 rounded-lg shadow-md border-2 border-yellow-600 min-w-[200px]">
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} />
      <div className="flex items-center gap-2 mb-2">
        <Zap size={16} />
        <span className="font-semibold">Condição</span>
      </div>
      <div className="text-sm bg-yellow-600 p-2 rounded">
        <div>Trigger: {data.condition || 'Sentimento'}</div>
        <div>Ação: {data.action || 'Resposta automática'}</div>
      </div>
      <Handle type="source" position={Position.Right} id="true" isConnectable={isConnectable} />
      <Handle type="source" position={Position.Bottom} id="false" isConnectable={isConnectable} />
    </div>
  );
};

const nodeTypes = {
  message: MessageNode,
  media: MediaNode,
  delay: DelayNode,
  trigger: TriggerNode,
  ai: AINode,
  conditional: ConditionalNode,
};

const initialNodes = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 100, y: 100 },
    data: { label: 'Início' },
  },
];

const initialEdges = [];

// Dashboard Component
const Dashboard = ({ onOpenFlowBuilder, instances, setInstances }) => {
  const [flows, setFlows] = useState([]);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [showFlowLogsModal, setShowFlowLogsModal] = useState(false);
  const [showTestWebhookModal, setShowTestWebhookModal] = useState(false);
  const [selectedFlowForLogs, setSelectedFlowForLogs] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [aiSettings, setAiSettings] = useState(null);
  const [isUpdatingData, setIsUpdatingData] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);

  useEffect(() => {
    loadFlows();
    loadInstances();
    loadAISettings();
  }, []);

  const loadFlows = async () => {
    try {
      const response = await axios.get(`${API}/flows`);
      setFlows(response.data);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const loadInstances = async () => {
    try {
      const response = await axios.get(`${API}/evolution/instances`);
      setInstances(response.data);
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await axios.get(`${API}/ai/settings`);
      setAiSettings(response.data);
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const createInstance = async (instanceName) => {
    try {
      const formData = new FormData();
      formData.append('instance_name', instanceName);

      await axios.post(`${API}/evolution/instances`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      loadInstances();
      alert('Instância criada com sucesso!');
    } catch (error) {
      console.error('Error creating instance:', error);
      alert('Erro ao criar instância');
    }
  };

  const getQRCode = async (instanceName) => {
    try {
      const response = await axios.get(`${API}/evolution/instances/${instanceName}/qr`);
      setQrCode(response.data.qrcode);
    } catch (error) {
      console.error('Error getting QR code:', error);
      alert('Erro ao obter QR code');
    }
  };

  const saveAISettings = async (newSettings) => {
    try {
      await axios.post(`${API}/ai/settings`, newSettings);
      setAiSettings(newSettings);
      alert('Configurações de IA salvas com sucesso!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Erro ao salvar configurações de IA');
    }
  };

  const deleteFlow = async (flowId) => {
    if (window.confirm('Tem certeza que deseja excluir este fluxo?')) {
      try {
        await axios.delete(`${API}/flows/${flowId}`);
        loadFlows();
        alert('Fluxo excluído com sucesso!');
      } catch (error) {
        console.error('Error deleting flow:', error);
        alert('Erro ao excluir fluxo');
      }
    }
  };

  const openFlowLogs = (flow) => {
    setSelectedFlowForLogs(flow);
    setShowFlowLogsModal(true);
  };

  const updateAllData = async () => {
    setIsUpdatingData(true);
    try {
      await Promise.all([
        loadFlows(),
        loadInstances(),
        loadAISettings()
      ]);
      alert('Dados atualizados com sucesso!');
    } catch (error) {
      console.error('Error updating data:', error);
      alert('Erro ao atualizar dados. Verifique o console para mais detalhes.');
    } finally {
      setIsUpdatingData(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">WhatsApp Flow Builder</h1>
                <p className="text-gray-600">Crie fluxos de automação inteligentes</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Sistema Online
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fluxos Criados</p>
                <p className="text-3xl font-bold text-gray-900">{flows.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Instâncias WhatsApp</p>
                <p className="text-3xl font-bold text-gray-900">{instances.length}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {instances.filter(i => i.status === 'open').length} conectadas
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">IA Configurada</p>
                <p className="text-3xl font-bold text-gray-900">{aiSettings ? '✓' : '✗'}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-8 mb-8 border border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <button
              onClick={onOpenFlowBuilder}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              <Plus className="w-8 h-8" />
              <span className="font-medium">Criar Novo Fluxo</span>
            </button>

            <button
              onClick={() => setShowInstanceModal(true)}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105"
            >
              <Smartphone className="w-8 h-8" />
              <span className="font-medium">Gerenciar WhatsApp</span>
            </button>

            <button
              onClick={() => setShowAISettingsModal(true)}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              <Settings className="w-8 h-8" />
              <span className="font-medium">Configurar IA</span>
            </button>

            <button
              onClick={() => setShowTestWebhookModal(true)}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105"
            >
              <Monitor className="w-8 h-8" />
              <span className="font-medium">Webhook Teste</span>
            </button>

            <button
              onClick={updateAllData}
              disabled={isUpdatingData}
              className={`flex flex-col items-center gap-3 p-6 rounded-xl transition-all duration-200 transform hover:scale-105 ${
                isUpdatingData 
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
              } text-white`}
            >
              <RefreshCw className={`w-8 h-8 ${isUpdatingData ? 'animate-spin' : ''}`} />
              <span className="font-medium">{isUpdatingData ? 'Atualizando...' : 'Atualizar Dados'}</span>
            </button>

            <button
              onClick={() => window.open(`${API}/webhook/logs`, '_blank')}
              className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl hover:from-teal-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105"
            >
              <Activity className="w-8 h-8" />
              <span className="font-medium">Logs Sistema</span>
            </button>
          </div>
        </div>

        {/* Flows List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Seus Fluxos</h2>
            <p className="text-gray-600 mt-1">Gerencie e execute seus fluxos de automação</p>
          </div>
          <div className="p-6">
            {flows.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum fluxo criado</h3>
                <p className="text-gray-600 mb-6">Comece criando seu primeiro fluxo de automação</p>
                <button
                  onClick={onOpenFlowBuilder}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5 inline mr-2" />
                  Criar Primeiro Fluxo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {flows.map((flow) => (
                  <div key={flow.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-lg">{flow.name}</h3>
                        <p className="text-gray-600 text-sm mt-1">{flow.description || 'Sem descrição'}</p>
                        {/* Indicador de Instância Conectada e Status */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              {flow.selectedInstance ? (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                                  {flow.selectedInstance}
                                </span>
                              ) : (
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  Qualquer instância
                                </span>
                              )}
                            </span>
                          </div>
                          {/* Status do Fluxo */}
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${flow.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <span className={`text-xs font-medium ${flow.isActive ? 'text-green-700' : 'text-red-700'}`}>
                              {flow.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openFlowLogs(flow)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver logs e detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteFlow(flow.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir fluxo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {flow.nodes?.length || 0} nós • {flow.edges?.length || 0} conexões
                      </span>
                      <button
                        onClick={() => onOpenFlowBuilder(flow)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instance Modal */}
      {showInstanceModal && (
        <InstanceModal
          instances={instances}
          onClose={() => setShowInstanceModal(false)}
          onCreateInstance={createInstance}
          onGetQRCode={getQRCode}
          qrCode={qrCode}
        />
      )}

      {/* AI Settings Modal */}
      {showAISettingsModal && (
        <AISettingsModal
          settings={aiSettings}
          onClose={() => setShowAISettingsModal(false)}
          onSave={saveAISettings}
        />
      )}

      {/* Flow Logs Modal */}
      {showFlowLogsModal && selectedFlowForLogs && (
        <FlowLogsModal
          show={showFlowLogsModal}
          onClose={() => {
            setShowFlowLogsModal(false);
            setSelectedFlowForLogs(null);
          }}
          flowId={selectedFlowForLogs.id}
          flowName={selectedFlowForLogs.name}
        />
      )}

      {/* Test Webhook Modal */}
      {showTestWebhookModal && (
        <TestWebhookModal
          show={showTestWebhookModal}
          onClose={() => setShowTestWebhookModal(false)}
        />
      )}
    </div>
  );
};

function FlowBuilder({ onBackToDashboard, instances, setInstances, flowToLoad }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flows, setFlows] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(null);
  const [selectedInstance, setSelectedInstance] = useState(''); // Instância WhatsApp selecionada para este fluxo
  const [isFlowActive, setIsFlowActive] = useState(false); // Controla se o fluxo está ativo
  const [selectedNode, setSelectedNode] = useState(null);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showAISettingsModal, setShowAISettingsModal] = useState(false);
  const [aiSettings, setAiSettings] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);

  // Load flows and instances on component mount
  useEffect(() => {
    loadFlows();
    loadInstances();
    loadAISettings();
  }, []);

  // Load specific flow if provided
  useEffect(() => {
    if (flowToLoad && flowToLoad.id) {
      setCurrentFlow(flowToLoad);
      setNodes(flowToLoad.nodes || []);
      setEdges(flowToLoad.edges || []);
      setSelectedInstance(flowToLoad.selectedInstance || ''); // Carregar instância selecionada
    } else if (flowToLoad === null) {
      // Novo fluxo - limpar estados
      setCurrentFlow(null);
      setSelectedInstance('');
      setIsFlowActive(false); // Limpar estado de ativação para novo fluxo
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [flowToLoad, setNodes, setEdges]);

  const loadFlows = async () => {
    try {
      const response = await axios.get(`${API}/flows`);
      setFlows(response.data);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  const loadInstances = async () => {
    try {
      const response = await axios.get(`${API}/evolution/instances`);
      setInstances(response.data);
    } catch (error) {
      console.error('Error loading instances:', error);
    }
  };

  const loadAISettings = async () => {
    try {
      const response = await axios.get(`${API}/ai/settings`);
      setAiSettings(response.data);
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const saveAISettings = async (newSettings) => {
    try {
      await axios.post(`${API}/ai/settings`, newSettings);
      setAiSettings(newSettings);
      alert('Configurações de IA salvas com sucesso!');
    } catch (error) {
      console.error('Error saving AI settings:', error);
      alert('Erro ao salvar configurações de IA');
    }
  };

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = (type) => {
    const id = `${type}-${Date.now()}`;
    const newNode = {
      id,
      type,
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: getDefaultNodeData(type),
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const getDefaultNodeData = (type) => {
    switch (type) {
      case 'message':
        return { message: 'Olá! Como posso ajudá-lo?' };
      case 'media':
        return { mediaType: 'image', caption: '', mediaUrl: '' };
      case 'delay':
        return { seconds: 5 };
      case 'trigger':
        return { label: 'Início' };
      case 'ai':
        return { 
          model: 'gpt-4', 
          prompt: 'Você é um assistente inteligente. Analise o sentimento da mensagem e responda de forma apropriada.',
          sentiment: true,
          language: 'pt-BR'
        };
      case 'conditional':
        return { 
          condition: 'sentiment', 
          action: 'auto_response',
          sentimentType: 'negative',
          responseType: 'media'
        };
      default:
        return {};
    }
  };

  const saveFlow = async () => {
    const flowData = {
      name: currentFlow?.name || `Fluxo ${flows.length + 1}`,
      description: currentFlow?.description || '',
      selectedInstance: selectedInstance || null, // Incluir instância selecionada
      isActive: isFlowActive, // Incluir estado de ativação
      nodes,
      edges,
    };

    try {
      if (currentFlow?.id) {
        await axios.put(`${API}/flows/${currentFlow.id}`, flowData);
      } else {
        await axios.post(`${API}/flows`, flowData);
      }
      loadFlows();
      alert('Fluxo salvo com sucesso!');
    } catch (error) {
      console.error('Error saving flow:', error);
      alert('Erro ao salvar fluxo');
    }
  };

  const loadFlow = async (flowId) => {
    try {
      const response = await axios.get(`${API}/flows/${flowId}`);
      const flow = response.data;
      setCurrentFlow(flow);
      setSelectedInstance(flow.selectedInstance || ''); // Carregar instância selecionada
      setIsFlowActive(flow.isActive || false); // Carregar estado de ativação
      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
    } catch (error) {
      console.error('Error loading flow:', error);
    }
  };

  const executeFlow = async (instanceName, recipient) => {
    if (!currentFlow?.id) {
      alert('Por favor, salve o fluxo antes de executar');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('recipient', recipient);
      formData.append('instance_name', instanceName);

      await axios.post(`${API}/flows/${currentFlow.id}/execute`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert('Fluxo executado com sucesso!');
      setShowExecuteModal(false);
    } catch (error) {
      console.error('Error executing flow:', error);
      alert('Erro ao executar fluxo');
    }
  };

  const createInstance = async (instanceName) => {
    try {
      const formData = new FormData();
      formData.append('instance_name', instanceName);

      await axios.post(`${API}/evolution/instances`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      loadInstances();
      alert('Instância criada com sucesso!');
    } catch (error) {
      console.error('Error creating instance:', error);
      alert('Erro ao criar instância');
    }
  };

  const getQRCode = async (instanceName) => {
    try {
      const response = await axios.get(`${API}/evolution/instances/${instanceName}/qr`);
      setQrCode(response.data.qrcode);
    } catch (error) {
      console.error('Error getting QR code:', error);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploadProgress(0);
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        },
      });

      setUploadProgress(null);
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadProgress(null);
      throw error;
    }
  };

  const onNodeClick = (event, node) => {
    setSelectedNode(node);
  };

  const updateNodeData = (nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Flow Builder</h2>
          <button
            onClick={onBackToDashboard}
            className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            ← Dashboard
          </button>
        </div>
        
        {/* Node Palette */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Adicionar Nós</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addNode('trigger')}
              className="flex items-center gap-2 p-3 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 transition-colors"
            >
              <Play size={16} />
              <span className="text-sm">Trigger</span>
            </button>
            <button
              onClick={() => addNode('message')}
              className="flex items-center gap-2 p-3 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 transition-colors"
            >
              <MessageSquare size={16} />
              <span className="text-sm">Mensagem</span>
            </button>
            <button
              onClick={() => addNode('ai')}
              className="flex items-center gap-2 p-3 bg-indigo-100 hover:bg-indigo-200 rounded-lg text-indigo-700 transition-colors"
            >
              <Brain size={16} />
              <span className="text-sm">IA</span>
            </button>
            <button
              onClick={() => addNode('conditional')}
              className="flex items-center gap-2 p-3 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-yellow-700 transition-colors"
            >
              <Zap size={16} />
              <span className="text-sm">Condição</span>
            </button>
            <button
              onClick={() => addNode('media')}
              className="flex items-center gap-2 p-3 bg-purple-100 hover:bg-purple-200 rounded-lg text-purple-700 transition-colors"
            >
              <Image size={16} />
              <span className="text-sm">Mídia</span>
            </button>
            <button
              onClick={() => addNode('delay')}
              className="flex items-center gap-2 p-3 bg-orange-100 hover:bg-orange-200 rounded-lg text-orange-700 transition-colors"
            >
              <Clock size={16} />
              <span className="text-sm">Delay</span>
            </button>
          </div>
        </div>

        {/* Configurações do Fluxo */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Configurações</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instância WhatsApp
              </label>
              <select
                value={selectedInstance}
                onChange={(e) => setSelectedInstance(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Qualquer instância</option>
                {instances.filter(i => i.status === 'open').map((instance) => (
                  <option key={instance.instanceName || instance.name} value={instance.instanceName || instance.name}>
                    {instance.instanceName || instance.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Selecione qual conta WhatsApp este fluxo deve usar
              </p>
            </div>
            
            {/* Controle de Ativação do Fluxo */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="font-medium text-gray-700">Fluxo Ativo</label>
                <p className="text-sm text-gray-600">Ativar/desativar este fluxo para receber mensagens</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isFlowActive}
                  onChange={(e) => setIsFlowActive(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Ações</h3>
          <div className="space-y-2">
            <button
              onClick={saveFlow}
              className="w-full flex items-center gap-2 p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              <Save size={16} />
              Salvar Fluxo
            </button>
            <button
              onClick={() => setShowExecuteModal(true)}
              className="w-full flex items-center gap-2 p-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
            >
              <Play size={16} />
              Executar Fluxo
            </button>
            <button
              onClick={() => setShowInstanceModal(true)}
              className="w-full flex items-center gap-2 p-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              <Smartphone size={16} />
              Gerenciar Instâncias
            </button>
            <button
              onClick={() => setShowAISettingsModal(true)}
              className="w-full flex items-center gap-2 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            >
              <Settings size={16} />
              Configurações IA
            </button>
          </div>
        </div>

        {/* Saved Flows */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Fluxos Salvos</h3>
          <div className="space-y-2">
            {flows.map((flow) => (
              <button
                key={flow.id}
                onClick={() => loadFlow(flow.id)}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="font-medium text-gray-800">{flow.name}</div>
                <div className="text-sm text-gray-600">{flow.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Node Editor */}
        {selectedNode && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Editar Nó</h3>
            <NodeEditor
              node={selectedNode}
              onUpdate={(newData) => updateNodeData(selectedNode.id, newData)}
              onFileUpload={handleFileUpload}
              uploadProgress={uploadProgress}
            />
          </div>
        )}
      </div>

      {/* Flow Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          className="bg-gray-50"
        >
          <Controls />
          <MiniMap />
          <Background variant="dots" gap={12} size={1} />
        </ReactFlow>
      </div>

      {/* Instance Modal */}
      {showInstanceModal && (
        <InstanceModal
          instances={instances}
          onClose={() => setShowInstanceModal(false)}
          onCreateInstance={createInstance}
          onGetQRCode={getQRCode}
          qrCode={qrCode}
        />
      )}

      {/* Execute Modal */}
      {showExecuteModal && (
        <ExecuteModal
          instances={instances}
          onClose={() => setShowExecuteModal(false)}
          onExecute={executeFlow}
        />
      )}

      {/* AI Settings Modal */}
      {showAISettingsModal && (
        <AISettingsModal
          settings={aiSettings}
          onClose={() => setShowAISettingsModal(false)}
          onSave={saveAISettings}
        />
      )}
    </div>
  );
}

// Node Editor Component
const NodeEditor = ({ node, onUpdate, onFileUpload, uploadProgress }) => {
  const [data, setData] = useState(node.data);

  useEffect(() => {
    setData(node.data);
  }, [node]);

  const handleChange = (key, value) => {
    const newData = { ...data, [key]: value };
    setData(newData);
    onUpdate(newData);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const uploadResult = await onFileUpload(file);
        handleChange('mediaUrl', `data:${uploadResult.contentType};base64,${uploadResult.base64}`);
      } catch (error) {
        alert('Erro ao fazer upload do arquivo');
      }
    }
  };

  switch (node.type) {
    case 'message':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Mensagem
          </label>
          <textarea
            value={data.message || ''}
            onChange={(e) => handleChange('message', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md resize-none"
            rows={3}
            placeholder="Digite sua mensagem..."
          />
        </div>
      );
    
    case 'ai':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Modelo IA
          </label>
          <select
            value={data.model || 'gpt-4'}
            onChange={(e) => handleChange('model', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          </select>
          
          <label className="block text-sm font-medium text-gray-700">
            Prompt Sistema
          </label>
          <textarea
            value={data.prompt || ''}
            onChange={(e) => handleChange('prompt', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md resize-none"
            rows={4}
            placeholder="Digite o prompt para a IA..."
          />
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sentiment"
              checked={data.sentiment || false}
              onChange={(e) => handleChange('sentiment', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="sentiment" className="text-sm text-gray-700">
              Ativar análise de sentimento
            </label>
          </div>
        </div>
      );
    
    case 'conditional':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Condição
          </label>
          <select
            value={data.condition || 'sentiment'}
            onChange={(e) => handleChange('condition', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="sentiment">Análise de Sentimento</option>
            <option value="keyword">Palavra-chave</option>
            <option value="intent">Intenção</option>
          </select>
          
          {data.condition === 'sentiment' && (
            <>
              <label className="block text-sm font-medium text-gray-700">
                Tipo de Sentimento
              </label>
              <select
                value={data.sentimentType || 'negative'}
                onChange={(e) => handleChange('sentimentType', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="negative">Negativo (Desinteresse)</option>
                <option value="positive">Positivo</option>
                <option value="neutral">Neutro</option>
                <option value="confused">Confuso/Dúvidas</option>
              </select>
            </>
          )}
          
          {data.condition === 'keyword' && (
            <>
              <label className="block text-sm font-medium text-gray-700">
                Palavras-chave (separadas por vírgula)
              </label>
              <input
                type="text"
                value={data.keywords || ''}
                onChange={(e) => handleChange('keywords', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
                placeholder="ex: cancelar, desistir, não quero"
              />
            </>
          )}
          
          <label className="block text-sm font-medium text-gray-700">
            Ação quando condição for verdadeira
          </label>
          <select
            value={data.responseType || 'media'}
            onChange={(e) => handleChange('responseType', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="media">Enviar Mídia</option>
            <option value="message">Enviar Mensagem</option>
            <option value="transfer">Transferir para Humano</option>
          </select>
        </div>
      );
    
    case 'media':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Mídia
          </label>
          <select
            value={data.mediaType || 'image'}
            onChange={(e) => handleChange('mediaType', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            <option value="image">Imagem</option>
            <option value="video">Vídeo</option>
            <option value="audio">Áudio</option>
            <option value="document">Documento</option>
          </select>
          
          <label className="block text-sm font-medium text-gray-700">
            Upload de Arquivo
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            accept={data.mediaType === 'image' ? 'image/*' : data.mediaType === 'video' ? 'video/*' : data.mediaType === 'audio' ? 'audio/*' : '*'}
          />
          
          {uploadProgress !== null && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}
          
          <label className="block text-sm font-medium text-gray-700">
            Legenda
          </label>
          <textarea
            value={data.caption || ''}
            onChange={(e) => handleChange('caption', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md resize-none"
            rows={2}
            placeholder="Legenda da mídia..."
          />
        </div>
      );
    
    case 'delay':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Tempo de Espera (segundos)
          </label>
          <input
            type="number"
            value={data.seconds || 1}
            onChange={(e) => handleChange('seconds', parseInt(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md"
            min="1"
            max="3600"
          />
        </div>
      );
    
    default:
      return <div>Nó selecionado não é editável</div>;
  }
};

// Instance Modal Component
const InstanceModal = ({ instances, onClose, onCreateInstance, onGetQRCode, qrCode }) => {
  const [instanceName, setInstanceName] = useState('');

  const handleCreate = () => {
    if (instanceName.trim()) {
      onCreateInstance(instanceName);
      setInstanceName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Gerenciar Instâncias WhatsApp</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nova Instância
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={instanceName}
              onChange={(e) => setInstanceName(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-md"
              placeholder="Nome da instância"
            />
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {instances && instances.length > 0 ? (
            instances.map((instance) => (
              <div key={instance.id || instance.instanceName} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{instance.instanceName}</div>
                    <div className="text-sm text-gray-600">Status: {instance.status || 'Desconhecido'}</div>
                  </div>
                  <button
                    onClick={() => onGetQRCode(instance.instanceName)}
                    className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    <QrCode size={16} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              Nenhuma instância encontrada. Crie uma nova instância.
            </div>
          )}
        </div>

        {qrCode && (
          <div className="mt-4 text-center">
            <img src={qrCode} alt="QR Code" className="mx-auto" />
            <p className="text-sm text-gray-600 mt-2">Escaneie o código QR no WhatsApp</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

// Execute Modal Component
const ExecuteModal = ({ instances, onClose, onExecute }) => {
  const [selectedInstance, setSelectedInstance] = useState('');
  const [recipient, setRecipient] = useState('');

  const handleExecute = () => {
    if (selectedInstance && recipient) {
      onExecute(selectedInstance, recipient);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold mb-4">Executar Fluxo</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instância WhatsApp
            </label>
            <select
              value={selectedInstance}
              onChange={(e) => setSelectedInstance(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Selecione uma instância</option>
              {instances.filter(i => i.status === 'open').map((instance) => (
                <option key={instance.id} value={instance.instanceName}>
                  {instance.instanceName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número do Destinatário
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="5511999999999"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleExecute}
            disabled={!selectedInstance || !recipient}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
          >
            Executar
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// AI Settings Modal Component
const AISettingsModal = ({ settings, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    defaultPrompt: '',
    enableSentimentAnalysis: true,
    enableAutoResponse: true,
    confidenceThreshold: 0.5,
    maxContextMessages: 5,
    openaiApiKey: ''
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultPrompt: settings.defaultPrompt || 'Você é um assistente inteligente em português. Responda de forma útil e amigável.',
        enableSentimentAnalysis: settings.enableSentimentAnalysis !== false,
        enableAutoResponse: settings.enableAutoResponse !== false,
        confidenceThreshold: settings.confidenceThreshold || 0.5,
        maxContextMessages: settings.maxContextMessages || 5,
        openaiApiKey: settings.openaiApiKey || ''
      });
    }
  }, [settings]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings size={20} />
          Configurações de IA
        </h3>
        
        <div className="space-y-4">
          {/* Default Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt Padrão da IA
            </label>
            <textarea
              value={formData.defaultPrompt}
              onChange={(e) => handleChange('defaultPrompt', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={4}
              placeholder="Digite o prompt que a IA deve usar por padrão..."
            />
            <div className="text-xs text-gray-500 mt-1">
              Este prompt será usado como base para todas as interações da IA
            </div>
          </div>

          {/* OpenAI API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chave API OpenAI
            </label>
            <input
              type="password"
              value={formData.openaiApiKey}
              onChange={(e) => handleChange('openaiApiKey', e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md"
              placeholder="sk-..."
            />
            <div className="text-xs text-gray-500 mt-1">
              Sua chave de API OpenAI. Deixe em branco para usar a configuração padrão do sistema
            </div>
          </div>

          {/* Switches */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="sentimentAnalysis"
                checked={formData.enableSentimentAnalysis}
                onChange={(e) => handleChange('enableSentimentAnalysis', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="sentimentAnalysis" className="text-sm text-gray-700">
                Ativar Análise de Sentimento
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoResponse"
                checked={formData.enableAutoResponse}
                onChange={(e) => handleChange('enableAutoResponse', e.target.checked)}
                className="rounded"
              />
              <label htmlFor="autoResponse" className="text-sm text-gray-700">
                Ativar Resposta Automática
              </label>
            </div>
          </div>

          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limite de Confiança para Sentimentos: {formData.confidenceThreshold}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.confidenceThreshold}
              onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-gray-500">
              Quanto maior o valor, mais certeza a IA precisa ter sobre o sentimento
            </div>
          </div>

          {/* Max Context Messages */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Máximo de Mensagens de Contexto
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.maxContextMessages}
              onChange={(e) => handleChange('maxContextMessages', parseInt(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <div className="text-xs text-gray-500">
              Quantas mensagens anteriores a IA deve considerar para contexto
            </div>
          </div>

          {/* Info about Manual Conditions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Condições Personalizadas</h4>
                <p className="text-xs text-blue-700">
                  Use os nós de <strong>Condição</strong> no flow builder para criar triggers personalizados. 
                  Você pode adicionar quantas condições quiser e conectá-las a diferentes ações.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            <Save size={16} className="inline mr-2" />
            Salvar Configurações
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// Flow Logs Modal Component
const FlowLogsModal = ({ show, onClose, flowId, flowName }) => {
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && flowId) {
      loadFlowData();
    }
  }, [show, flowId]);

  const loadFlowData = async () => {
    setLoading(true);
    try {
      const [logsRes, messagesRes, executionsRes] = await Promise.all([
        axios.get(`${API}/flows/${flowId}/logs`),
        axios.get(`${API}/flows/${flowId}/messages`),
        axios.get(`${API}/flows/${flowId}/executions`)
      ]);
      
      setLogs(logsRes.data);
      setMessages(messagesRes.data);
      setExecutions(executionsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do fluxo:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Logs e Detalhes</h2>
            <p className="text-gray-600">{flowName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {['logs', 'messages', 'executions'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'logs' && (
                  <>
                    <FileText size={16} className="inline mr-2" />
                    Logs ({logs.length})
                  </>
                )}
                {tab === 'messages' && (
                  <>
                    <MessageSquare size={16} className="inline mr-2" />
                    Mensagens ({messages.length})
                  </>
                )}
                {tab === 'executions' && (
                  <>
                    <Activity size={16} className="inline mr-2" />
                    Execuções ({executions.length})
                  </>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="animate-spin text-blue-500 mr-2" />
              Carregando...
            </div>
          ) : (
            <>
              {activeTab === 'logs' && (
                <div className="space-y-3">
                  {logs.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhum log encontrado</p>
                  ) : (
                    logs.map((log, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm uppercase">{log.level}</span>
                          <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <p className="text-sm mb-2">{log.message}</p>
                        {log.nodeId && (
                          <p className="text-xs text-gray-600">Nó: {log.nodeId}</p>
                        )}
                        {Object.keys(log.details || {}).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-600 cursor-pointer">Ver detalhes</summary>
                            <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhuma mensagem encontrada</p>
                  ) : (
                    messages.map((message, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${
                        message.direction === 'incoming' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              message.direction === 'incoming' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {message.direction === 'incoming' ? 'Recebida' : 'Enviada'}
                            </span>
                            <span className="text-xs text-gray-600">{message.messageType}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                        </div>
                        <p className="text-sm mb-2">{message.message}</p>
                        <p className="text-xs text-gray-600">
                          Contato: {message.contactNumber} | Instância: {message.instanceName}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'executions' && (
                <div className="space-y-3">
                  {executions.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Nenhuma execução encontrada</p>
                  ) : (
                    executions.map((execution, index) => (
                      <div key={index} className="p-4 rounded-lg border bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              execution.status === 'completed' ? 'bg-green-100 text-green-700' :
                              execution.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {execution.status}
                            </span>
                            <span className="text-xs text-gray-600">ID: {execution.id.substring(0, 8)}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatTimestamp(execution.startedAt)}</span>
                        </div>
                        {execution.log && execution.log.length > 0 && (
                          <details>
                            <summary className="text-xs text-gray-600 cursor-pointer mb-2">
                              Ver logs da execução ({execution.log.length} entradas)
                            </summary>
                            <div className="space-y-2">
                              {execution.log.map((logEntry, logIndex) => (
                                <div key={logIndex} className="text-xs bg-white p-2 rounded border-l-2 border-gray-300">
                                  <div className="flex justify-between">
                                    <span>{logEntry.nodeType || 'Sistema'}</span>
                                    <span className="text-gray-500">{formatTimestamp(logEntry.timestamp)}</span>
                                  </div>
                                  {logEntry.error && <p className="text-red-600 mt-1">Erro: {logEntry.error}</p>}
                                </div>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 border-t">
          <button
            onClick={loadFlowData}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 mr-4"
          >
            <RefreshCw size={16} className="inline mr-2" />
            Atualizar
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Test Webhook Modal Component
const TestWebhookModal = ({ show, onClose }) => {
  const [settings, setSettings] = useState({});
  const [logs, setLogs] = useState([]);
  const [testPayload, setTestPayload] = useState('{\n  "test": "message",\n  "data": {\n    "user": "test"\n  }\n}');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show) {
      loadWebhookData();
    }
  }, [show]);

  const loadWebhookData = async () => {
    setLoading(true);
    try {
      const [settingsRes, logsRes] = await Promise.all([
        axios.get(`${API}/test-webhook/settings`),
        axios.get(`${API}/test-webhook/logs`)
      ]);
      
      setSettings(settingsRes.data);
      setLogs(logsRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados do webhook:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (key, value) => {
    try {
      const response = await axios.put(`${API}/test-webhook/settings`, {
        [key]: value
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
    }
  };

  const sendTestWebhook = async () => {
    try {
      const payload = JSON.parse(testPayload);
      await axios.post(`${API}/test-webhook`, payload);
      loadWebhookData(); // Refresh logs
      alert('Webhook de teste enviado com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar webhook de teste:', error);
      alert('Erro ao enviar webhook: ' + error.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Webhook de Teste</h2>
            <p className="text-gray-600">Configure e teste webhooks</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configurações */}
            <div>
              <h3 className="text-lg font-medium mb-4">Configurações</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-medium">Webhook Habilitado</label>
                    <p className="text-sm text-gray-600">Ativar/desativar webhook de teste</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.enabled || false}
                      onChange={(e) => updateSettings('enabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <label className="font-medium">Logs Habilitados</label>
                    <p className="text-sm text-gray-600">Salvar logs das requisições</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.logsEnabled || false}
                      onChange={(e) => updateSettings('logs_enabled', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <label className="font-medium">URL do Webhook</label>
                  <p className="text-sm text-gray-600 mb-2">Use esta URL para testes:</p>
                  <div className="bg-white p-2 rounded border text-sm font-mono break-all">
                    {BACKEND_URL}/api/test-webhook
                  </div>
                </div>

                {/* Test Payload */}
                <div>
                  <label className="block font-medium mb-2">Payload de Teste</label>
                  <textarea
                    value={testPayload}
                    onChange={(e) => setTestPayload(e.target.value)}
                    className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
                    placeholder="Digite o JSON de teste..."
                  />
                  <button
                    onClick={sendTestWebhook}
                    className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                  >
                    <Zap size={16} className="inline mr-2" />
                    Enviar Teste
                  </button>
                </div>
              </div>
            </div>

            {/* Logs */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Logs de Requisições ({logs.length})</h3>
                <button
                  onClick={loadWebhookData}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600"
                >
                  <RefreshCw size={14} className="inline mr-1" />
                  Atualizar
                </button>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="animate-spin text-blue-500 mr-2" />
                    Carregando...
                  </div>
                ) : logs.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum log encontrado</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{log.event}</span>
                        <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Status: {log.processed ? 'Processado' : 'Pendente'}
                        {log.error && <span className="text-red-600 ml-2">• Erro: {log.error}</span>}
                      </div>
                      <details>
                        <summary className="text-xs text-gray-600 cursor-pointer">Ver Payload</summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-x-auto">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'flowbuilder'
  const [instances, setInstances] = useState([]);
  const [flowToLoad, setFlowToLoad] = useState(null);

  const handleOpenFlowBuilder = (flow = null) => {
    setFlowToLoad(flow);
    setCurrentView('flowbuilder');
  };

  return (
    <div className="App">
      {currentView === 'dashboard' ? (
        <Dashboard 
          onOpenFlowBuilder={handleOpenFlowBuilder}
          instances={instances}
          setInstances={setInstances}
        />
      ) : (
        <FlowBuilder 
          onBackToDashboard={() => setCurrentView('dashboard')}
          instances={instances}
          setInstances={setInstances}
          flowToLoad={flowToLoad}
        />
      )}
    </div>
  );
}

export default App;