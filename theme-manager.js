/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// theme-manager.js - Gestionnaire de thèmes pour Anthropoïd

// Classe ThemeManager définie AVANT tout le reste
class ThemeManager {
  constructor() {
    this.currentTheme = "auto"; // Par défaut suit Firefox
    this.mediaQuery = null;
    this.isInitialized = false;
  }

  /**
   * Initialise le gestionnaire de thèmes
   */
  async init() {
    if (this.isInitialized) {
      console.log("⚠️ Theme Manager déjà initialisé");
      return;
    }

    try {
      console.log("🔧 Initialisation Theme Manager...");

      // Charger le thème sauvegardé
      await this.loadStoredTheme();

      // Appliquer le thème
      this.applyTheme();

      // Surveiller les changements de thème système
      this.watchSystemTheme();

      this.isInitialized = true;
      console.log(
        `✅ Theme Manager initialisé avec le thème: ${this.currentTheme}`
      );

      // Debug dans la console
      this.logCurrentTheme();
    } catch (error) {
      console.error("❌ Erreur initialisation Theme Manager:", error);
    }
  }

  /**
   * Charge le thème depuis le storage
   */
  async loadStoredTheme() {
    try {
      // Essayer d'abord storage.sync puis storage.local
      let result = await new Promise((resolve) => {
        chrome.storage.sync.get(["theme"], (syncResult) => {
          if (chrome.runtime.lastError) {
            chrome.storage.local.get(["theme"], (localResult) => {
              if (chrome.runtime.lastError) {
                console.log("⚠️ Erreur accès storage, utilisation du défaut");
                resolve({ theme: "auto" });
              } else {
                resolve(localResult);
              }
            });
          } else {
            resolve(syncResult);
          }
        });
      });

      this.currentTheme = result.theme || "auto";
      console.log(`📥 Thème chargé depuis le storage: ${this.currentTheme}`);
    } catch (error) {
      console.warn("⚠️ Erreur chargement thème, utilisation du défaut:", error);
      this.currentTheme = "auto";
    }
  }

  /**
   * Applique le thème au document
   */
  applyTheme() {
    if (!document.documentElement) {
      console.warn("⚠️ Document non prêt pour appliquer le thème");
      return;
    }

    console.log(`🎨 Application du thème: ${this.currentTheme}`);

    // Appliquer l'attribut data-theme
    document.documentElement.setAttribute("data-theme", this.currentTheme);

    // Ajouter des classes CSS si nécessaire
    document.body.classList.remove("theme-light", "theme-dark", "theme-auto");
    document.body.classList.add(`theme-${this.currentTheme}`);

    // Log du thème effectif (utile pour auto)
    const effectiveTheme = this.getEffectiveTheme();
    console.log(
      `✅ Thème appliqué: ${this.currentTheme} (effectif: ${effectiveTheme})`
    );
  }

  /**
   * Surveille les changements de thème système pour le mode auto
   */
  watchSystemTheme() {
    // Nettoyer l'ancien listener s'il existe
    if (this.mediaQuery) {
      this.mediaQuery.removeEventListener(
        "change",
        this.handleSystemThemeChange
      );
    }

    // Créer le nouveau media query
    this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // Ajouter le listener pour les changements
    this.handleSystemThemeChange = (e) => {
      if (this.currentTheme === "auto") {
        console.log(
          `🔄 Changement thème système détecté: ${
            e.matches ? "sombre" : "clair"
          }`
        );
        // Re-appliquer le thème pour déclencher les transitions CSS
        this.applyTheme();
        this.logCurrentTheme();
      }
    };

    this.mediaQuery.addEventListener("change", this.handleSystemThemeChange);
    console.log("👁️ Surveillance du thème système activée");
  }

  /**
   * Change le thème et le sauvegarde
   */
  async setTheme(newTheme) {
    if (!["auto", "light", "dark"].includes(newTheme)) {
      console.error(`❌ Thème invalide: ${newTheme}`);
      return false;
    }

    if (this.currentTheme === newTheme) {
      console.log(`⚠️ Thème ${newTheme} déjà actif`);
      return true;
    }

    try {
      console.log(`🔄 Changement de thème: ${this.currentTheme} → ${newTheme}`);

      this.currentTheme = newTheme;

      // Appliquer immédiatement
      this.applyTheme();

      // Sauvegarder
      await this.saveTheme();

      // Mettre à jour la surveillance système
      this.watchSystemTheme();

      console.log(`✅ Thème changé vers: ${newTheme}`);
      this.logCurrentTheme();

      return true;
    } catch (error) {
      console.error("❌ Erreur changement de thème:", error);
      return false;
    }
  }

  /**
   * Sauvegarde le thème actuel
   */
  async saveTheme() {
    try {
      // Sauvegarder dans les deux storages pour la compatibilité
      await new Promise((resolve, reject) => {
        const themeData = { theme: this.currentTheme };

        chrome.storage.sync.set(themeData, () => {
          if (chrome.runtime.lastError) {
            // Fallback vers storage.local
            chrome.storage.local.set(themeData, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          } else {
            // Sauvegarder aussi en local pour redondance
            chrome.storage.local.set(themeData, () => {
              resolve(); // Ignorer les erreurs du local si sync a marché
            });
          }
        });
      });

      console.log(`💾 Thème sauvegardé: ${this.currentTheme}`);
    } catch (error) {
      console.warn("⚠️ Erreur sauvegarde thème:", error);
    }
  }

  /**
   * Retourne le thème effectif (résout 'auto')
   */
  getEffectiveTheme() {
    if (this.currentTheme === "auto") {
      return this.mediaQuery && this.mediaQuery.matches ? "dark" : "light";
    }
    return this.currentTheme;
  }

  /**
   * Retourne le thème actuel
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Vérifie si le thème sombre est actif
   */
  isDarkTheme() {
    return this.getEffectiveTheme() === "dark";
  }

  /**
   * Vérifie si le thème clair est actif
   */
  isLightTheme() {
    return this.getEffectiveTheme() === "light";
  }

  /**
   * Log d'information sur le thème actuel
   */
  logCurrentTheme() {
    const effective = this.getEffectiveTheme();
    const systemDark = this.mediaQuery ? this.mediaQuery.matches : false;

    console.log(`🎨 État du thème:`, {
      configured: this.currentTheme,
      effective: effective,
      systemPrefersDark: systemDark,
      isAuto: this.currentTheme === "auto",
    });
  }

  /**
   * Nettoie les listeners (pour éviter les fuites mémoire)
   */
  destroy() {
    if (this.mediaQuery && this.handleSystemThemeChange) {
      this.mediaQuery.removeEventListener(
        "change",
        this.handleSystemThemeChange
      );
    }
    this.isInitialized = false;
    console.log("🗑️ Theme Manager nettoyé");
  }
}

// Instance globale
let themeManager = null;

/**
 * Initialise le gestionnaire de thèmes
 * À appeler dans DOMContentLoaded de chaque page
 */
async function initThemeManager() {
  if (!themeManager) {
    themeManager = new ThemeManager();
  }

  await themeManager.init();
  return themeManager;
}

/**
 * Raccourci pour changer le thème
 */
async function setTheme(theme) {
  if (!themeManager) {
    console.error("❌ Theme Manager non initialisé");
    return false;
  }

  return await themeManager.setTheme(theme);
}

/**
 * Raccourci pour obtenir le thème actuel
 */
function getCurrentTheme() {
  return themeManager ? themeManager.getCurrentTheme() : "auto";
}

/**
 * Raccourci pour obtenir le thème effectif
 */
function getEffectiveTheme() {
  return themeManager ? themeManager.getEffectiveTheme() : "light";
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ThemeManager,
    initThemeManager,
    setTheme,
    getCurrentTheme,
    getEffectiveTheme,
  };
}

// Export global - ThemeManager est maintenant défini
window.ThemeManager = ThemeManager;
window.initThemeManager = initThemeManager;
window.setTheme = setTheme;
window.getCurrentTheme = getCurrentTheme;
window.getEffectiveTheme = getEffectiveTheme;

// Fonction async pour les logs uniquement
(async function () {
  const logger = await getLogger();

  logger.info("🎨 Theme Manager chargé");
  logger.info("✅ Theme Manager défini globalement");
})().catch(console.error);
