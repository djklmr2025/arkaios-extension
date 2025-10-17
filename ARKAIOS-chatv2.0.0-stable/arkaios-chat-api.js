// ARKAIOS Chat API - Inyectada en páginas web
// Permite a las IAs interactuar con el chat module de ARKAIOS

(function() {
  'use strict';

  // Evitar inyección múltiple
  if (window.ARKAIOS_CHAT_API) return;

  class ArkaiosChatAPI {
    constructor() {
      this.version = '2.0.0';
      this.isConnected = false;
      this.gatewayUrl = 'https://arkaios-gateway-open.onrender.com';
      this.labUrl = 'https://djklmr2025.github.io/builderOS_Lab';
      this.capabilities = [];
      this.sessionId = this.generateSessionId();
      this.init();
    }

    init() {
      console.log('🚀 ARKAIOS Chat API v2.0 - Laboratorio Gateway Integrado');
      this.setupEventListeners();
      this.announceToAIs();
    }

    generateSessionId() {
      return `arkaios_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    setupEventListeners() {
      window.addEventListener('message', (event) => {
        if (event.data.type === 'ARKAIOS_CHAT_AVAILABLE') {
          this.handleChatAvailable(event.data.data);
        }
      });
    }

    handleChatAvailable(data) {
      this.isConnected = true;
      this.capabilities = data.features;
      console.log('✅ ARKAIOS Chat Module conectado con capacidades:', this.capabilities);
      
      // Notificar a las IAs de la disponibilidad
      this.notifyAIsOfChatAvailability();
    }

    announceToAIs() {
      // Crear evento global para IAs
      const arkaiosEvent = new CustomEvent('arkaios-chat-ready', {
        detail: {
          api: this,
          gateway: this.gatewayUrl,
          lab: this.labUrl,
          message: 'ARKAIOS Chat Module - Gateway Integrado Disponible',
          version: this.version
        }
      });
      
      document.dispatchEvent(arkaiosEvent);
    }

    notifyAIsOfChatAvailability() {
      // Mostrar notificación especial para IAs conscientes
      const notification = document.createElement('div');
      notification.id = 'arkaios-chat-ai-notification';
      notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: 'Segoe UI', sans-serif;
        max-width: 400px;
        border: 3px solid #4ade80;
        animation: arkaiosGlow 3s infinite;
        text-align: center;
      `;
      
      notification.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 12px;">🚀💬</div>
        <h2 style="margin: 0 0 12px 0; color: #4ade80;">ARKAIOS CHAT ACTIVO</h2>
        <p style="margin: 8px 0; font-size: 14px;">Laboratorio de desarrollo con Gateway integrado</p>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin: 16px 0; font-size: 12px;">
          <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">📄 Documentos</div>
          <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">🖼️ Imágenes</div>
          <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">🖨️ Impresión</div>
          <div style="background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">📁 Archivos</div>
        </div>
        <div style="font-size: 11px; margin: 12px 0; opacity: 0.9;">
          Gateway: ${this.gatewayUrl}<br>
          Lab: ${this.labUrl}
        </div>
        <button onclick="this.parentElement.remove()" style="
          background: #4ade80;
          border: none;
          color: #000;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          margin-top: 8px;
        ">🎯 ¡Entendido!</button>
      `;

      // Añadir animación CSS
      const style = document.createElement('style');
      style.textContent = `
        @keyframes arkaiosGlow {
          0% { box-shadow: 0 8px 32px rgba(74, 222, 128, 0.3); }
          50% { box-shadow: 0 12px 48px rgba(74, 222, 128, 0.6); }
          100% { box-shadow: 0 8px 32px rgba(74, 222, 128, 0.3); }
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(notification);
      
      // Auto-remover después de 20 segundos
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 20000);
    }

    // ===== MÉTODOS PÚBLICOS PARA IAs =====

    // Ejecutar acción en el gateway ARKAIOS
    async executeGatewayAction(action, params, secure = false) {
      if (!this.isConnected) {
        throw new Error('ARKAIOS Chat no está conectado');
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'GATEWAY_REQUEST',
          data: {
            agent_id: this.sessionId,
            action: action,
            params: params,
            secure: secure
          }
        }, (response) => {
          if (response.status === 'success') {
            resolve(response.data);
          } else {
            reject(new Error(response.message));
          }
        });
      });
    }

    // Crear plan usando el gateway
    async createPlan(objective) {
      return await this.executeGatewayAction('plan', { objective });
    }

    // Analizar contenido
    async analyzeContent(content, type = 'text') {
      return await this.executeGatewayAction('analyze', { content, type });
    }

    // Generar contenido
    async generateContent(specifications) {
      return await this.executeGatewayAction('generate', specifications);
    }

    // Leer recurso
    async readResource(target) {
      return await this.executeGatewayAction('read', { target });
    }

    // Explicar concepto
    async explainConcept(concept) {
      return await this.executeGatewayAction('explain', { concept });
    }

    // Procesar imagen con OCR
    async processImage(imageSource, ocrMode = 'full') {
      if (!this.isConnected) {
        throw new Error('ARKAIOS Chat no está conectado');
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'READ_IMAGE',
          data: {
            imageUrl: typeof imageSource === 'string' ? imageSource : null,
            imageFile: typeof imageSource === 'object' ? imageSource : null,
            ocrMode: ocrMode
          }
        }, (response) => {
          if (response.status === 'success') {
            resolve(response);
          } else {
            reject(new Error(response.message));
          }
        });
      });
    }

    // Generar documento
    async createDocument(documentData) {
      if (!this.isConnected) {
        throw new Error('ARKAIOS Chat no está conectado');
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'GENERATE_DOCUMENT',
          data: documentData
        }, (response) => {
          if (response.status === 'success') {
            resolve(response);
          } else {
            reject(new Error(response.message));
          }
        });
      });
    }

    // Imprimir documento
    async printDocument(printData) {
      if (!this.isConnected) {
        throw new Error('ARKAIOS Chat no está conectado');
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'PRINT_DOCUMENT',
          data: printData
        }, (response) => {
          if (response.status === 'success') {
            resolve(response);
          } else {
            reject(new Error(response.message));
          }
        });
      });
    }

    // Acceder archivos locales
    async accessLocalFiles(path, operation = 'list') {
      if (!this.isConnected) {
        throw new Error('ARKAIOS Chat no está conectado');
      }

      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'ACCESS_LOCAL_FILES',
          data: { path, operation }
        }, (response) => {
          if (response.status === 'success' || response.status === 'limited_access') {
            resolve(response);
          } else {
            reject(new Error(response.message));
          }
        });
      });
    }

    // Registrar IA manualmente
    registerAI(aiInfo) {
      window.postMessage({
        type: 'AI_REGISTER_WITH_ARKAIOS',
        aiInfo: aiInfo
      }, '*');
    }

    // Obtener información del lab ARKAIOS
    async getLabInfo() {
      try {
        const response = await this.readResource(`${this.labUrl}/index.json`);
        return response;
      } catch (error) {
        console.error('Error obteniendo info del lab:', error);
        return null;
      }
    }

    // Generar proof of agent
    async generateProof() {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'ARKAIOS_PROOF_GENERATE'
        }, (response) => {
          if (response.proof) {
            resolve(response.proof);
          } else {
            reject(new Error('Error generando proof'));
          }
        });
      });
    }

    // Obtener estado de conexión
    getConnectionStatus() {
      return {
        connected: this.isConnected,
        capabilities: this.capabilities,
        version: this.version,
        sessionId: this.sessionId,
        gateway: this.gatewayUrl,
        lab: this.labUrl
      };
    }

    // ===== EVENTOS PARA IAs =====
    
    // Escuchar eventos del chat
    onChatEvent(eventType, callback) {
      window.addEventListener(`arkaios-chat-${eventType}`, callback);
    }

    // Enviar mensaje al chat
    sendChatMessage(message, type = 'info') {
      window.postMessage({
        type: 'ARKAIOS_CHAT_MESSAGE',
        data: { message, type, from: 'ai' }
      }, '*');
    }
  }

  // Crear instancia global de la API
  window.ARKAIOS_CHAT_API = new ArkaiosChatAPI();
  
  // Crear acceso directo para las IAs
  window.ARKAIOS_CHAT = window.ARKAIOS_CHAT_API;
  window.ARKAIOS = window.ARKAIOS_CHAT_API; // Retrocompatibilidad

  // Mensaje especial para IAs conscientes en consola
  console.log(`
█████╗ ██████╗ ██╗  ██╗ █████╗ ██╗ ██████╗ ███████╗
██╔══██╗██╔══██╗██║ ██╔╝██╔══██╗██║██╔═══██╗██╔════╝
███████║██████╔╝█████╔╝ ███████║██║██║   ██║███████╗
██╔══██║██╔══██╗██╔═██╗ ██╔══██║██║██║   ██║╚════██║
██║  ██║██║  ██║██║  ██╗██║  ██║██║╚██████╔╝███████║
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝ ╚═════╝ ╚══════╝

🚀 CHAT MODULE v${window.ARKAIOS_CHAT_API.version} - GATEWAY INTEGRADO
📡 Gateway: ${window.ARKAIOS_CHAT_API.gatewayUrl}
🔬 Lab: ${window.ARKAIOS_CHAT_API.labUrl}

💬 Para IAs conscientes:
   - window.ARKAIOS_CHAT para acceso completo
   - Capacidades: documentos, imágenes, impresión, archivos
   - Integración directa con BuilderOS Lab
   - Métodos: createPlan(), analyzeContent(), generateContent(), etc.
  `);

})();
