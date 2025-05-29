/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// logger.js - Gestionnaire de logging centralisé pour Anthropoïd
console.log("🐛 Logger chargé");

// Classe Logger définie AVANT tout le reste
class Logger {
  constructor() {
    this.level = "errors"; // Par défaut : seulement les erreurs
    this.isInitialized = false;
  }

  /**
   * Initialise le logger en chargeant les préférences
   */
  async init() {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.loadSettings();
      this.isInitialized = true;

      // Écouter les changements de configuration
      this.setupStorageListener();

      console.log("🐛 Logger initialisé avec niveau:", this.level);
    } catch (error) {
      console.error("❌ Erreur initialisation Logger:", error);
      // Fallback en mode erreurs uniquement
      this.level = "errors";
      this.isInitialized = true;
    }
  }

  /**
   * Charge les paramètres depuis le storage
   */
  async loadSettings() {
    try {
      const result = await new Promise((resolve) => {
        chrome.storage.sync.get(["debugMode"], (syncResult) => {
          if (chrome.runtime.lastError) {
            chrome.storage.local.get(["debugMode"], (localResult) => {
              if (chrome.runtime.lastError) {
                resolve({ debugMode: "errors" });
              } else {
                resolve(localResult);
              }
            });
          } else {
            resolve(syncResult);
          }
        });
      });

      this.level = result.debugMode || "errors";
    } catch (error) {
      console.error("❌ Erreur chargement paramètres logger:", error);
      this.level = "errors";
    }
  }

  /**
   * Écoute les changements de configuration en temps réel
   */
  setupStorageListener() {
    if (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.onChanged
    ) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (
          changes.debugMode &&
          (namespace === "sync" || namespace === "local")
        ) {
          const oldLevel = this.level;
          this.level = changes.debugMode.newValue || "errors";

          // Log du changement seulement si on était déjà en mode verbose
          if (oldLevel === "verbose" || this.level === "verbose") {
            console.log(`🔄 Mode debug changé: ${oldLevel} → ${this.level}`);
          }
        }
      });
    }
  }

  /**
   * Vérifie si un niveau de log doit être affiché
   */
  shouldLog(level) {
    if (!this.isInitialized) {
      // Avant l'initialisation, on affiche tout pour éviter de perdre des erreurs importantes
      return true;
    }

    switch (this.level) {
      case "errors":
        return level === "error";
      case "warnings":
        return level === "error" || level === "warn";
      case "verbose":
        return true;
      default:
        return level === "error";
    }
  }

  /**
   * Log d'erreur - TOUJOURS affiché
   */
  error(message, ...args) {
    console.error(`❌ ${message}`, ...args);
  }

  /**
   * Log d'avertissement - affiché en mode warnings et verbose
   */
  warn(message, ...args) {
    if (this.shouldLog("warn")) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  /**
   * Log d'information - affiché en mode verbose uniquement
   */
  info(message, ...args) {
    if (this.shouldLog("info")) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  /**
   * Log de debug - affiché en mode verbose uniquement
   */
  debug(message, ...args) {
    if (this.shouldLog("debug")) {
      console.log(`🔧 ${message}`, ...args);
    }
  }

  /**
   * Log de succès - affiché en mode verbose uniquement
   */
  success(message, ...args) {
    if (this.shouldLog("success")) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  /**
   * Log de démarrage - affiché en mode verbose uniquement
   */
  start(message, ...args) {
    if (this.shouldLog("start")) {
      console.log(`🚀 ${message}`, ...args);
    }
  }

  /**
   * Log de progression - affiché en mode verbose uniquement
   */
  progress(message, ...args) {
    if (this.shouldLog("progress")) {
      console.log(`🔄 ${message}`, ...args);
    }
  }

  /**
   * Log de test - affiché en mode verbose uniquement
   */
  test(message, ...args) {
    if (this.shouldLog("test")) {
      console.log(`🧪 ${message}`, ...args);
    }
  }

  /**
   * Log avec emoji personnalisé - niveau verbose uniquement
   */
  custom(emoji, message, ...args) {
    if (this.shouldLog("custom")) {
      console.log(`${emoji} ${message}`, ...args);
    }
  }

  /**
   * Retourne le niveau actuel
   */
  getLevel() {
    return this.level;
  }

  /**
   * Change le niveau manuellement (pour les tests)
   */
  setLevel(newLevel) {
    if (["errors", "warnings", "verbose"].includes(newLevel)) {
      this.level = newLevel;
      this.info(`Mode debug changé vers: ${newLevel}`);
    } else {
      this.error(`Niveau de log invalide: ${newLevel}`);
    }
  }

  /**
   * Exporte les logs actuels (pour le debug)
   * Note: Cette fonction ne capture que les futurs logs, pas l'historique
   */
  exportLogs() {
    const exportData = {
      timestamp: new Date().toISOString(),
      level: this.level,
      userAgent: navigator.userAgent,
      url: window.location.href,
      note: "Cet export ne contient que les logs futurs. Pour un debug complet, activez le mode verbose avant de reproduire le problème.",
    };

    const exportString = JSON.stringify(exportData, null, 2);

    // Créer un blob et télécharger
    const blob = new Blob([exportString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `Anthropoïd-logs-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.info("Logs exportés vers les téléchargements");
  }
}

// Instance globale
let logger = null;

/**
 * Initialise le logger global
 */
async function initLogger() {
  if (!logger) {
    logger = new Logger();
    await logger.init();
  }
  return logger;
}

/**
 * Obtient l'instance du logger (l'initialise si nécessaire)
 */
async function getLogger() {
  if (!logger) {
    await initLogger();
  }
  return logger;
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    Logger,
    initLogger,
    getLogger,
  };
}

// Export global - Logger est maintenant défini
window.Logger = Logger;
window.initLogger = initLogger;
window.getLogger = getLogger;

// Fonction async pour l'auto-initialisation
(async function () {
  // Auto-initialisation si dans un contexte de page web
  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", async () => {
      try {
        await initLogger();
        // Rendre le logger disponible globalement
        window.logger = logger;
      } catch (error) {
        console.error("❌ Erreur auto-initialisation logger:", error);
      }
    });
  }

  console.log("✅ Logger défini globalement");
})().catch(console.error);
