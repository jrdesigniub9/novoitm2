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
  Zap
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

function FlowBuilder({ onBackToDashboard, instances, setInstances }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [flows, setFlows] = useState([]);
  const [currentFlow, setCurrentFlow] = useState(null);
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
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Flow Builder</h2>
        
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
          {instances.map((instance) => (
            <div key={instance.id} className="p-3 border border-gray-200 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{instance.instanceName}</div>
                  <div className="text-sm text-gray-600">Status: {instance.status}</div>
                </div>
                <button
                  onClick={() => onGetQRCode(instance.instanceName)}
                  className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  <QrCode size={16} />
                </button>
              </div>
            </div>
          ))}
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
    disinterestTriggers: [],
    doubtTriggers: []
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultPrompt: settings.defaultPrompt || 'Você é um assistente inteligente em português. Responda de forma útil e amigável.',
        enableSentimentAnalysis: settings.enableSentimentAnalysis !== false,
        enableAutoResponse: settings.enableAutoResponse !== false,
        confidenceThreshold: settings.confidenceThreshold || 0.5,
        maxContextMessages: settings.maxContextMessages || 5,
        disinterestTriggers: settings.disinterestTriggers || ["não quero", "desistir", "cancelar", "chato", "pare"],
        doubtTriggers: settings.doubtTriggers || ["dúvida", "não entendi", "confuso", "como", "o que", "por que"]
      });
    }
  }, [settings]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleArrayChange = (key, value) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [key]: array }));
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
          </div>

          {/* Switches */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Disinterest Triggers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palavras que Indicam Desinteresse
            </label>
            <input
              type="text"
              value={formData.disinterestTriggers.join(', ')}
              onChange={(e) => handleArrayChange('disinterestTriggers', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="não quero, desistir, cancelar..."
            />
            <div className="text-xs text-gray-500">
              Separar palavras por vírgula. Quando detectadas, a IA tentará reter o cliente.
            </div>
          </div>

          {/* Doubt Triggers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Palavras que Indicam Dúvidas
            </label>
            <input
              type="text"
              value={formData.doubtTriggers.join(', ')}
              onChange={(e) => handleArrayChange('doubtTriggers', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="dúvida, não entendi, confuso..."
            />
            <div className="text-xs text-gray-500">
              Separar palavras por vírgula. Quando detectadas, a IA enviará conteúdo explicativo.
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

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'flowbuilder'
  const [instances, setInstances] = useState([]);

  return (
    <div className="App">
      {currentView === 'dashboard' ? (
        <Dashboard 
          onOpenFlowBuilder={() => setCurrentView('flowbuilder')}
          instances={instances}
          setInstances={setInstances}
        />
      ) : (
        <FlowBuilder 
          onBackToDashboard={() => setCurrentView('dashboard')}
          instances={instances}
          setInstances={setInstances}
        />
      )}
    </div>
  );
}

export default App;