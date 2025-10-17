// ARKAIOS Chat Module Controller
// Interfaz principal del chat integrado con Gateway ARKAIOS

class ArkaiosChatModule {
  constructor() {
    this.gatewayUrl = 'https://arkaios-gateway-open.onrender.com';
    this.labUrl = 'https://djklmr2025.github.io/builderOS_Lab';
    this.bearerToken = 'KaOQ1ZQ4gyF5bkgxkiwPEFgkrUMW31ZEwVhOITkLRO5jaImetmUlYJegOdwG';
    this.connectedAIs = new Map();
    this.chatHistory = [];
    this.isGatewayOnline = false;
    this.currentMode = 'open'; // 'open' o 'secure'
    this.init();
  }

  init() {
    console.log('🚀 ARKAIOS Chat Module iniciado');
    this.setupEventListeners();
    this.loadSettings();
    this.checkGatewayStatus();
    this.setupUI();
  }

  setupEventListeners() {
    // Navigation y UI
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.openSettings();
    });
    
    document.getElementById('closeSettings').addEventListener('click', () => {
      this.closeSettings();
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Chat functionality
    document.getElementById('sendBtn').addEventListener('click', () => {
      this.sendMessage();
    });

    document.getElementById('chatInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    document.getElementById('chatInput').addEventListener('input', (e) => {
      this.autoResizeTextarea(e.target);
    });

    // Toolbar buttons
    document.getElementById('imageBtn').addEventListener('click', () => {
      this.triggerFileInput('image');
    });

    document.getElementById('fileBtn').addEventListener('click', () => {
      this.requestFileAccess();
    });

    document.getElementById('printBtn').addEventListener('click', () => {
      this.setupPrint();
    });

    document.getElementById('docBtn').addEventListener('click', () => {
      this.generateDocument();
    });

    document.getElementById('codeBtn').addEventListener('click', () => {
      this.toggleCodeMode();
    });

    // File input
    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files[0]);
    });

    // Gateway action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.executeQuickAction(e.target.dataset.action);
      });
    });

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message, sender, sendResponse);
    });

    // Listen for window messages (from injected API)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'ARKAIOS_CHAT_MESSAGE') {
        this.handleExternalMessage(event.data.data);
      }
    });
  }

  setupUI() {
    this.updateGatewayStatus('Verificando conexión...');
    this.updateModeIndicator();
    this.showWelcomeMessage();
  }

  showWelcomeMessage() {
    // El mensaje de bienvenida ya está en el HTML
    // Aquí podríamos agregar lógica adicional si es necesario
  }

  async checkGatewayStatus() {
    try {
      this.showLoading(true);
      
      // Verificar estado del gateway
      const response = await fetch(`${this.gatewayUrl}/aida/health`);
      
      if (response.ok) {
        this.isGatewayOnline = true;
        this.updateGatewayStatus('🟢 Gateway Online');
        
        // Obtener información del lab
        await this.loadLabInfo();
      } else {
        throw new Error('Gateway no disponible');
      }
    } catch (error) {
      console.log('⚠️ Gateway en sleep mode, despertando...');
      this.isGatewayOnline = false;
      this.updateGatewayStatus('🟡 Despertando Gateway...');
      
      // Esperar y reintentar
      setTimeout(() => this.checkGatewayStatus(), 30000);
    } finally {
      this.showLoading(false);
    }
  }

  async loadLabInfo() {
    try {
      const labInfoResponse = await this.executeGatewayRequest('read', {
        target: `${this.labUrl}/index.json`
      });
      
      if (labInfoResponse.ok) {
        console.log('📚 Lab info cargada:', labInfoResponse.data);
        this.addMessage('system', '✅ Conectado al BuilderOS Lab de ARKAIOS', 'success');
      }
    } catch (error) {
      console.error('Error cargando lab info:', error);
    }
  }

  updateGatewayStatus(status) {
    const statusElement = document.getElementById('gatewayStatus');
    const statusText = statusElement.querySelector('.status-text');
    const statusDot = statusElement.querySelector('.status-dot');
    
    statusText.textContent = status;
    
    if (this.isGatewayOnline) {
      statusDot.classList.remove('disconnected');
    } else {
      statusDot.classList.add('disconnected');
    }
  }

  updateModeIndicator() {
    const modeText = document.querySelector('.mode-text');
    const secureIndicator = document.getElementById('secureMode');
    
    if (this.currentMode === 'secure') {
      modeText.textContent = 'Modo: Seguro';
      secureIndicator.textContent = '🔐 SECURE';
      secureIndicator.classList.add('secure');
    } else {
      modeText.textContent = 'Modo: Chat Normal';
      secureIndicator.textContent = '🔓 OPEN';
      secureIndicator.classList.remove('secure');
    }
  }

  handleBackgroundMessage(message, sender, sendResponse) {
    const { target, event, data } = message;
    
    if (target === 'chat_module') {
      switch (event) {
        case 'AI_CONNECTED':
          this.addConnectedAI(data);
          break;
        case 'GATEWAY_RESPONSE':
          this.handleGatewayResponse(data);
          break;
      }
    }
  }

  handleExternalMessage(data) {
    const { message, type, from } = data;
    
    if (from === 'ai') {
      this.addMessage('assistant', message, type);
    }
  }

  addConnectedAI(aiInfo) {
    this.connectedAIs.set(aiInfo.id, aiInfo);
    this.updateAIList();
    this.addMessage('system', `🤖 ${aiInfo.platform} conectada al chat`, 'info');
  }

  updateAIList() {
    const aiList = document.getElementById('detectedAIs');
    
    if (this.connectedAIs.size === 0) {
      aiList.innerHTML = '<div class="no-ais"><p>🔍 Detectando IAs en páginas web...</p></div>';
      return;
    }

    const aiChips = Array.from(this.connectedAIs.values()).map(ai => `
      <div class="ai-chip">
        <span>🤖</span>
        <span>${ai.platform}</span>
      </div>
    `).join('');
    
    aiList.innerHTML = aiChips;
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Agregar mensaje del usuario
    this.addMessage('user', message);
    input.value = '';
    this.autoResizeTextarea(input);
    
    // Procesar mensaje
    await this.processMessage(message);
  }

  async processMessage(message) {
    this.showLoading(true);
    
    try {
      // Determinar si es un comando específico
      if (message.startsWith('/')) {
        await this.handleCommand(message);
      } else {
        // Procesar como mensaje normal con el gateway
        await this.processWithGateway(message);
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      this.addMessage('assistant', `❌ Error: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async handleCommand(command) {
    const [cmd, ...args] = command.slice(1).split(' ');
    const argument = args.join(' ');
    
    switch (cmd.toLowerCase()) {
      case 'plan':
        await this.executeGatewayAction('plan', { objective: argument });
        break;
      case 'analyze':
        await this.executeGatewayAction('analyze', { content: argument });
        break;
      case 'generate':
        await this.executeGatewayAction('generate', { prompt: argument });
        break;
      case 'read':
        await this.executeGatewayAction('read', { target: argument });
        break;
      case 'explain':
        await this.executeGatewayAction('explain', { concept: argument });
        break;
      case 'secure':
        this.currentMode = 'secure';
        this.updateModeIndicator();
        this.addMessage('system', '🔐 Modo seguro activado', 'info');
        break;
      case 'open':
        this.currentMode = 'open';
        this.updateModeIndicator();
        this.addMessage('system', '🔓 Modo abierto activado', 'info');
        break;
      case 'help':
        this.showHelp();
        break;
      default:
        this.addMessage('assistant', `❓ Comando desconocido: ${cmd}. Usa /help para ver comandos disponibles.`, 'error');
    }
  }

  async processWithGateway(message) {
    // Determinar la mejor acción basada en el contenido del mensaje
    let action = 'explain'; // Por defecto
    let params = { concept: message };
    
    // Análisis simple del mensaje para determinar la acción
    if (message.toLowerCase().includes('plan') || message.toLowerCase().includes('planifica')) {
      action = 'plan';
      params = { objective: message };
    } else if (message.toLowerCase().includes('analiza') || message.toLowerCase().includes('analyze')) {
      action = 'analyze';
      params = { content: message };
    } else if (message.toLowerCase().includes('genera') || message.toLowerCase().includes('crea')) {
      action = 'generate';
      params = { prompt: message };
    }
    
    await this.executeGatewayAction(action, params);
  }

  async executeQuickAction(action) {
    const input = document.getElementById('chatInput');
    const context = input.value.trim() || `Ejecutar acción: ${action}`;
    
    switch (action) {
      case 'plan':
        await this.executeGatewayAction('plan', { objective: context });
        break;
      case 'analyze':
        await this.executeGatewayAction('analyze', { content: context });
        break;
      case 'generate':
        await this.executeGatewayAction('generate', { prompt: context });
        break;
      case 'read':
        const target = prompt('Ingresa la URL o recurso a leer:', this.labUrl + '/index.json');
        if (target) {
          await this.executeGatewayAction('read', { target });
        }
        break;
    }
  }

  async executeGatewayAction(action, params) {
    try {
      const response = await this.executeGatewayRequest(action, params);
      
      if (response.ok) {
        this.handleGatewayResponse(response.data);
      } else {
        throw new Error(response.error || 'Error en gateway request');
      }
    } catch (error) {
      console.error('Error en gateway action:', error);
      this.addMessage('assistant', `❌ Error ejecutando ${action}: ${error.message}`, 'error');
    }
  }

  async executeGatewayRequest(action, params) {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Agregar autenticación si está en modo seguro
    if (this.currentMode === 'secure') {
      headers['Authorization'] = `Bearer ${this.bearerToken}`;
    }
    
    // Agregar proof of agent
    const proof = this.generateArkaiosProof();
    if (proof) {
      headers['X-ARK-Proof'] = proof;
    }
    
    const response = await fetch(`${this.gatewayUrl}/aida/gateway`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent_id: 'arkaios_chat_module',
        action,
        params
      })
    });
    
    const data = await response.json();
    
    return {
      ok: response.ok,
      status: response.status,
      data: data,
      error: data.error
    };
  }

  generateArkaiosProof() {
    try {
      const basePhrase = 'χρῆσθαι φῶς κρυπτόν ἀριθμός: 8412197';
      const currentDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fullString = `${basePhrase}:${currentDate}`;
      
      // Simple hash implementation
      let hash = 0;
      for (let i = 0; i < fullString.length; i++) {
        const char = fullString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      
      return Math.abs(hash).toString(16).substring(0, 12);
    } catch (error) {
      console.error('Error generando proof:', error);
      return null;
    }
  }

  handleGatewayResponse(data) {
    let responseMessage = '';
    let messageType = 'info';
    
    if (data.action === 'plan' && data.data?.plan) {
      responseMessage = `📋 **Plan creado:**\n${data.data.plan.map((step, i) => `${i + 1}. ${step}`).join('\n')}`;
      messageType = 'success';
    } else if (data.action === 'analyze') {
      responseMessage = `🔍 **Análisis:** ${JSON.stringify(data.data, null, 2)}`;
      messageType = 'info';
    } else if (data.action === 'generate') {
      responseMessage = `✨ **Contenido generado:** ${data.data.generated_content || JSON.stringify(data.data)}`;
      messageType = 'success';
    } else if (data.action === 'read') {
      responseMessage = `📖 **Recurso leído:** ${JSON.stringify(data.data, null, 2)}`;
      messageType = 'info';
    } else if (data.action === 'explain') {
      responseMessage = `💡 **Explicación:** ${data.data.explanation || JSON.stringify(data.data)}`;
      messageType = 'info';
    } else {
      responseMessage = `🔄 **Respuesta del Gateway:** ${JSON.stringify(data, null, 2)}`;
      messageType = 'info';
    }
    
    this.addMessage('assistant', responseMessage, messageType);
  }

  addMessage(sender, content, type = 'info') {
    const messagesContainer = document.getElementById('chatMessages');
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender} ${type}`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    // Formatear contenido con markdown básico
    const formattedContent = this.formatMessage(content);
    messageContent.innerHTML = formattedContent;
    
    messageElement.appendChild(messageContent);
    messagesContainer.appendChild(messageElement);
    
    // Scroll al último mensaje
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Agregar al historial
    this.chatHistory.push({
      sender,
      content,
      type,
      timestamp: new Date().toISOString()
    });
  }

  formatMessage(content) {
    // Formateo básico de markdown
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // Code blocks
      .replace(/\n/g, '<br>'); // Line breaks
  }

  showHelp() {
    const helpMessage = `
🚀 **Comandos ARKAIOS Chat:**

**Gateway Commands:**
• \`/plan <objetivo>\` - Crear plan con ARKAIOS
• \`/analyze <contenido>\` - Analizar contenido
• \`/generate <prompt>\` - Generar contenido
• \`/read <url>\` - Leer recurso web
• \`/explain <concepto>\` - Explicar concepto

**Mode Commands:**
• \`/secure\` - Activar modo seguro
• \`/open\` - Activar modo abierto
• \`/help\` - Mostrar esta ayuda

**Features:**
🖼️ Procesamiento de imágenes con OCR
📄 Generación de documentos
🖨️ Soporte de impresión
📁 Acceso a archivos locales
🤖 Detección automática de IAs
`;
    
    this.addMessage('system', helpMessage, 'info');
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  triggerFileInput(type) {
    const fileInput = document.getElementById('fileInput');
    
    if (type === 'image') {
      fileInput.accept = 'image/*';
    } else {
      fileInput.accept = '.pdf,.txt,.doc,.docx';
    }
    
    fileInput.click();
  }

  async handleFileUpload(file) {
    if (!file) return;
    
    this.showLoading(true);
    
    try {
      if (file.type.startsWith('image/')) {
        await this.processImageFile(file);
      } else {
        await this.processDocumentFile(file);
      }
    } catch (error) {
      console.error('Error procesando archivo:', error);
      this.addMessage('assistant', `❌ Error procesando archivo: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async processImageFile(file) {
    // Crear URL para la imagen
    const imageUrl = URL.createObjectURL(file);
    
    this.addMessage('user', `🖼️ Imagen subida: ${file.name}`, 'info');
    
    // Procesar con OCR via background script
    const response = await chrome.runtime.sendMessage({
      action: 'READ_IMAGE',
      data: {
        imageFile: file,
        ocrMode: 'full'
      }
    });
    
    if (response.status === 'success') {
      this.addMessage('assistant', `📖 **Texto extraído de la imagen:**\n${response.ocrResult.text}`, 'success');
      
      if (response.analysis) {
        this.addMessage('assistant', `🔍 **Análisis ARKAIOS:**\n${JSON.stringify(response.analysis, null, 2)}`, 'info');
      }
    }
    
    // Limpiar URL
    URL.revokeObjectURL(imageUrl);
  }

  async processDocumentFile(file) {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      const content = e.target.result;
      this.addMessage('user', `📄 Documento subido: ${file.name}`, 'info');
      
      // Analizar contenido con ARKAIOS
      await this.executeGatewayAction('analyze', {
        content: content.substring(0, 5000), // Limitar contenido
        type: 'document',
        filename: file.name
      });
    };
    
    reader.readAsText(file);
  }

  async requestFileAccess() {
    const path = prompt('Ingresa la ruta del directorio a acceder:', 'C:\\arkaios\\ARK-AI-OS\\nuevas propuestas');
    
    if (!path) return;
    
    this.showLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'ACCESS_LOCAL_FILES',
        data: { path, operation: 'list' }
      });
      
      this.addMessage('assistant', `📁 **Acceso a archivos:**\n${JSON.stringify(response, null, 2)}`, 'info');
    } catch (error) {
      this.addMessage('assistant', `❌ Error accediendo archivos: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async setupPrint() {
    const content = prompt('Ingresa el contenido a imprimir:', 'Documento generado por ARKAIOS Chat');
    
    if (!content) return;
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'PRINT_DOCUMENT',
        data: {
          content,
          title: 'ARKAIOS Document',
          format: 'html'
        }
      });
      
      this.addMessage('assistant', '🖨️ Documento enviado a impresión', 'success');
    } catch (error) {
      this.addMessage('assistant', `❌ Error configurando impresión: ${error.message}`, 'error');
    }
  }

  async generateDocument() {
    const specifications = prompt('Especificaciones del documento:', 'Documento de ejemplo generado por ARKAIOS');
    
    if (!specifications) return;
    
    this.showLoading(true);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'GENERATE_DOCUMENT',
        data: {
          type: 'text',
          specifications: { prompt: specifications },
          filename: 'arkaios-document.txt',
          format: 'txt'
        }
      });
      
      if (response.status === 'success') {
        this.addMessage('assistant', `📄 Documento generado: ${response.filename}`, 'success');
      }
    } catch (error) {
      this.addMessage('assistant', `❌ Error generando documento: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  toggleCodeMode() {
    const codeBtn = document.getElementById('codeBtn');
    const chatInput = document.getElementById('chatInput');
    
    codeBtn.classList.toggle('active');
    
    if (codeBtn.classList.contains('active')) {
      chatInput.placeholder = 'Modo código activo - Escribe tu código aquí...';
      chatInput.style.fontFamily = 'monospace';
      this.addMessage('system', '💻 Modo código activado', 'info');
    } else {
      chatInput.placeholder = 'Escribe tu mensaje para ARKAIOS...';
      chatInput.style.fontFamily = 'inherit';
      this.addMessage('system', '💬 Modo chat activado', 'info');
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
      overlay.classList.add('show');
    } else {
      overlay.classList.remove('show');
    }
  }

  openSettings() {
    document.getElementById('settingsModal').classList.add('show');
  }

  closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
  }

  loadSettings() {
    chrome.storage.local.get(['arkaiosChatSettings'], (result) => {
      const settings = result.arkaiosChatSettings || {};
      
      document.getElementById('gatewayUrl').value = settings.gatewayUrl || this.gatewayUrl;
      document.getElementById('bearerToken').value = settings.bearerToken || this.bearerToken;
      document.getElementById('autoOCR').checked = settings.autoOCR || false;
      document.getElementById('autoPrint').checked = settings.autoPrint || false;
      document.getElementById('fileAccess').checked = settings.fileAccess || false;
      document.getElementById('detectionMode').value = settings.detectionMode || 'normal';
    });
  }

  saveSettings() {
    const settings = {
      gatewayUrl: document.getElementById('gatewayUrl').value,
      bearerToken: document.getElementById('bearerToken').value,
      autoOCR: document.getElementById('autoOCR').checked,
      autoPrint: document.getElementById('autoPrint').checked,
      fileAccess: document.getElementById('fileAccess').checked,
      detectionMode: document.getElementById('detectionMode').value,
      updatedAt: new Date().toISOString()
    };

    // Actualizar configuración local
    this.gatewayUrl = settings.gatewayUrl;
    this.bearerToken = settings.bearerToken;

    chrome.storage.local.set({ arkaiosChatSettings: settings }, () => {
      this.addMessage('system', '💾 Configuración guardada', 'success');
      this.closeSettings();
    });
  }

  resetSettings() {
    if (confirm('¿Restaurar configuración por defecto?')) {
      chrome.storage.local.remove(['arkaiosChatSettings'], () => {
        this.loadSettings();
        this.addMessage('system', '🔄 Configuración restaurada', 'info');
      });
    }
  }
}

// Inicializar chat module cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  const arkaiosChatModule = new ArkaiosChatModule();
  
  // Exportar para debugging
  window.ARKAIOS_CHAT_MODULE = arkaiosChatModule;
});
