/**
 * ARKAIOS Remote Capture Module v1.0
 * Captura pantalla y envía snapshots al proxy para que Comet los vea
 */

class RemoteScreenCapture {
  constructor(proxyUrl = "https://arkaios-service-proxy.onrender.com") {
    this.proxyUrl = proxyUrl;
    this.isCapturing = false;
    this.captureInterval = null;
    this.sessionId = null;
    this.lastFrameTime = 0;
    this.frameRate = 1000; // 1 frame/segundo (ajustable)
    
    console.log("[RemoteCapture] Inicializado. Proxy:", this.proxyUrl);
  }

  /**
   * Inicia captura de pantalla
   */
  async startCapture() {
    if (this.isCapturing) {
      console.warn("[RemoteCapture] Captura ya está activa");
      return false;
    }

    try {
      // Generar sessionId único
      this.sessionId = "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
      console.log("[RemoteCapture] Iniciando captura. SessionID:", this.sessionId);

      // Notificar al proxy que la sesión inicia
      await this.notifySessionStart();

      // Iniciar loop de captura
      this.isCapturing = true;
      this.captureLoop();
      
      return true;
    } catch (err) {
      console.error("[RemoteCapture] Error al iniciar:", err);
      return false;
    }
  }

  /**
   * Loop de captura periódico
   */
  async captureLoop() {
    while (this.isCapturing) {
      const now = Date.now();
      
      // Respetar frameRate
      if (now - this.lastFrameTime >= this.frameRate) {
        try {
          await this.captureAndSend();
          this.lastFrameTime = now;
        } catch (err) {
          console.error("[RemoteCapture] Error en captura:", err);
        }
      }

      // Esperar antes de siguiente intento
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Captura pantalla usando getDisplayMedia y envía al proxy
   */
  async captureAndSend() {
    try {
      // Usar getDisplayMedia para capturar pantalla/ventana
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always" // Mostrar cursor
        },
        audio: false
      });

      // Crear canvas y obtener frame actual
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Esperar a que inicie
      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      // Dibujar en canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);

      // Detener stream
      stream.getTracks().forEach(track => track.stop());

      // Convertir a JPEG comprimido
      const jpegData = canvas.toDataURL('image/jpeg', 0.7); // 70% calidad
      
      // Enviar al proxy
      await this.sendFrameToProxy(jpegData, canvas.width, canvas.height);

    } catch (err) {
      if (err.name === "NotAllowedError") {
        console.log("[RemoteCapture] Usuario canceló compartir pantalla");
        this.stopCapture();
      } else {
        console.error("[RemoteCapture] Error en captura:", err);
      }
    }
  }

  /**
   * Envía frame al proxy
   */
  async sendFrameToProxy(frameData, width, height) {
    try {
      const response = await fetch(`${this.proxyUrl}/v1/remote/frame`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          frameData: frameData, // base64 JPEG
          width: width,
          height: height,
          timestamp: Date.now(),
          source: "arkaios-extension"
        })
      });

      if (!response.ok) {
        console.warn("[RemoteCapture] Proxy respondió con error:", response.status);
      }
    } catch (err) {
      console.error("[RemoteCapture] Error enviando frame:", err);
    }
  }

  /**
   * Notifica al proxy que sesión iniciò
   */
  async notifySessionStart() {
    try {
      await fetch(`${this.proxyUrl}/v1/remote/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          startTime: Date.now(),
          clientType: "extension"
        })
      });
      console.log("[RemoteCapture] Sesión iniciada en proxy");
    } catch (err) {
      console.error("[RemoteCapture] Error notificando sesión:", err);
    }
  }

  /**
   * Detiene la captura
   */
  stopCapture() {
    if (!this.isCapturing) return;
    
    this.isCapturing = false;
    if (this.captureInterval) clearInterval(this.captureInterval);
    
    console.log("[RemoteCapture] Captura detenida. SessionID:", this.sessionId);
  }

  /**
   * Cambia frame rate (fps)
   */
  setFrameRate(fps) {
    this.frameRate = 1000 / Math.max(1, fps);
    console.log("[RemoteCapture] Frame rate ajustado a", fps, "fps");
  }
}

// Exponer globalmente para content.js
window.RemoteScreenCapture = RemoteScreenCapture;
