/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// version-manager.js - Gestionnaire de version centralisé

// Classe VersionManager définie AVANT tout le reste
class VersionManager {
  constructor() {
    this.version = null;
    this.isInitialized = false;
  }

  /**
   * Initialise le gestionnaire de version
   */
  async init() {
    if (this.isInitialized) {
      console.log("⚠️ Version Manager déjà initialisé");
      return this.version;
    }

    try {
      console.log("🔧 Initialisation Version Manager...");

      // Récupérer la version depuis le manifest
      this.version = await this.getVersionFromManifest();

      // Appliquer la version dans le DOM
      this.applyVersionToDOM();

      this.isInitialized = true;
      console.log(`✅ Version Manager initialisé: v${this.version}`);

      return this.version;
    } catch (error) {
      console.error("❌ Erreur initialisation Version Manager:", error);
      // Fallback version
      this.version = "1.0";
      this.applyVersionToDOM();
      return this.version;
    }
  }

  /**
   * Récupère la version depuis le manifest de l'extension
   */
  async getVersionFromManifest() {
    try {
      // Dans le contexte d'une extension, utiliser chrome.runtime
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        chrome.runtime.getManifest
      ) {
        const manifest = chrome.runtime.getManifest();
        console.log(
          "📋 Version récupérée depuis le manifest:",
          manifest.version
        );
        return manifest.version;
      }

      // Fallback : essayer de récupérer via fetch (pour les pages standalone)
      try {
        const response = await fetch(chrome.runtime.getURL("manifest.json"));
        const manifest = await response.json();
        console.log("📋 Version récupérée via fetch:", manifest.version);
        return manifest.version;
      } catch (fetchError) {
        console.warn(
          "⚠️ Impossible de récupérer le manifest via fetch:",
          fetchError
        );
      }

      // Si rien ne fonctionne, utiliser une version par défaut
      console.warn(
        "⚠️ Impossible de récupérer la version, utilisation du fallback"
      );
      return "1.0";
    } catch (error) {
      console.error("❌ Erreur récupération version:", error);
      return "1.0";
    }
  }

  /**
   * Applique la version dans le DOM
   */
  applyVersionToDOM() {
    if (!this.version || !document) {
      console.warn("⚠️ Version ou document non disponible");
      return;
    }

    console.log(`🎯 Application de la version v${this.version} dans le DOM...`);

    // Sélecteurs pour les éléments contenant la version
    const versionSelectors = [
      '[data-i18n="versionInfo"]',
      '[data-i18n="universalExtensionVersion"]',
      ".version-info strong",
      ".footer strong",
      "#versionDisplay",
      ".extension-version",
    ];

    let elementsUpdated = 0;

    versionSelectors.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        if (element) {
          // Préserver l'emoji et le nom si présents
          let newText = `Anthropoïd v${this.version}`;

          // Si l'élément contient déjà un emoji ou "Anthropoïd", le préserver
          const currentText = element.textContent || "";
          if (currentText.includes("👆")) {
            newText = `Anthropoïd v${this.version}`;
          } else if (currentText.includes("Anthropoïd")) {
            newText = `Anthropoïd v${this.version}`;
          }

          element.textContent = newText;
          elementsUpdated++;
          console.log(`✅ Version mise à jour dans ${selector}: "${newText}"`);
        }
      });
    });

    // Mettre à jour les attributs data-version s'ils existent
    const versionAttributes = document.querySelectorAll("[data-version]");
    versionAttributes.forEach((element) => {
      element.setAttribute("data-version", this.version);
      elementsUpdated++;
    });

    // Mettre à jour les meta tags de version
    let versionMeta = document.querySelector('meta[name="version"]');
    if (!versionMeta) {
      versionMeta = document.createElement("meta");
      versionMeta.name = "version";
      document.head.appendChild(versionMeta);
    }
    versionMeta.content = this.version;

    console.log(`✅ ${elementsUpdated} éléments de version mis à jour`);
  }

  /**
   * Retourne la version actuelle
   */
  getVersion() {
    return this.version;
  }

  /**
   * Retourne la version formatée pour l'affichage
   */
  getFormattedVersion(includeEmoji = false, includeName = true) {
    if (!this.version) return "Version inconnue";

    let formatted = "";
    if (includeName) {
      formatted += "Anthropoïd";
      if (includeEmoji) {
        formatted += " 👆";
      }
      formatted += " ";
    }
    formatted += `v${this.version}`;

    return formatted;
  }

  /**
   * Met à jour la version dans les éléments i18n
   */
  updateI18nVersions() {
    if (typeof chrome !== "undefined" && chrome.i18n) {
      // Pour les clés i18n qui utilisent des substitutions
      const versionElements = document.querySelectorAll(
        '[data-i18n*="version"]'
      );
      versionElements.forEach((element) => {
        const i18nKey = element.getAttribute("data-i18n");
        if (i18nKey) {
          const message = chrome.i18n.getMessage(i18nKey, [this.version]);
          if (message && message !== i18nKey) {
            element.textContent = message;
          }
        }
      });
    }
  }

  /**
   * Crée un élément de version pour insertion dynamique
   */
  createVersionElement(options = {}) {
    const {
      tag = "span",
      className = "extension-version",
      includeEmoji = false,
      includeName = true,
    } = options;

    const element = document.createElement(tag);
    element.className = className;
    element.textContent = this.getFormattedVersion(includeEmoji, includeName);
    element.setAttribute("data-version", this.version);

    return element;
  }
}

// Instance globale
let versionManager = null;

/**
 * Initialise le gestionnaire de version
 * À appeler dans DOMContentLoaded de chaque page
 */
async function initVersionManager() {
  if (!versionManager) {
    versionManager = new VersionManager();
  }

  const version = await versionManager.init();
  return version;
}

/**
 * Raccourci pour obtenir la version
 */
function getExtensionVersion() {
  return versionManager ? versionManager.getVersion() : "1.0";
}

/**
 * Raccourci pour obtenir la version formatée
 */
function getFormattedVersion(includeEmoji = false, includeName = true) {
  return versionManager
    ? versionManager.getFormattedVersion(includeEmoji, includeName)
    : "Anthropoïd v1.0";
}

/**
 * Met à jour manuellement tous les éléments de version
 */
function updateAllVersionElements() {
  if (versionManager) {
    versionManager.applyVersionToDOM();
    versionManager.updateI18nVersions();
  }
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VersionManager,
    initVersionManager,
    getExtensionVersion,
    getFormattedVersion,
    updateAllVersionElements,
  };
}

// Export global - VersionManager est maintenant défini
window.VersionManager = VersionManager;
window.initVersionManager = initVersionManager;
window.getExtensionVersion = getExtensionVersion;
window.getFormattedVersion = getFormattedVersion;
window.updateAllVersionElements = updateAllVersionElements;

// Fonction async pour les logs uniquement
(async function () {
  const logger = await getLogger();

  logger.info("📦 Version Manager chargé");
  logger.info("✅ Version Manager défini globalement");
})().catch(console.error);
