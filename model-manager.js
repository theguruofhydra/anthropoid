/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// model-manager.js - Gestionnaire dynamique des modèles Claude

// Classe ModelManager définie AVANT tout le reste
class ModelManager {
  constructor() {
    this.models = [];
    this.isInitialized = false;
    this.lastUpdate = null;
    this.updateInterval = 24 * 60 * 60 * 1000; // 24 heures
    this.fallbackModels = [
      {
        id: "claude-3-haiku-20240307",
        name: "Claude 3 Haiku",
        description: "Rapide et économique",
        family: "claude-3",
        capabilities: ["text"],
        maxTokens: 4096,
        isDefault: false,
      },
      {
        id: "claude-3-5-sonnet-20241022",
        name: "Claude 3.5 Sonnet",
        description: "Équilibré et performant",
        family: "claude-3.5",
        capabilities: ["text"],
        maxTokens: 8192,
        isDefault: true,
      },
      {
        id: "claude-3-opus-20240229",
        name: "Claude 3 Opus",
        description: "Le plus puissant",
        family: "claude-3",
        capabilities: ["text"],
        maxTokens: 4096,
        isDefault: false,
      },
    ];
  }

  /**
   * Initialise le gestionnaire de modèles
   */
  async init() {
    if (this.isInitialized) {
      console.log("⚠️ Model Manager déjà initialisé");
      return this.models;
    }

    try {
      console.log("🔧 Initialisation Model Manager...");

      // Charger les modèles depuis le cache
      await this.loadCachedModels();

      // Vérifier si une mise à jour est nécessaire
      if (this.needsUpdate()) {
        console.log("🔄 Mise à jour des modèles nécessaire");
        await this.updateModels();
      } else {
        console.log("✅ Modèles en cache à jour");
      }

      this.isInitialized = true;
      console.log(
        `✅ Model Manager initialisé avec ${this.models.length} modèles`
      );

      return this.models;
    } catch (error) {
      console.error("❌ Erreur initialisation Model Manager:", error);
      // Utiliser les modèles de fallback
      this.models = [...this.fallbackModels];
      this.isInitialized = true;
      return this.models;
    }
  }

  /**
   * Charge les modèles depuis le cache local
   */
  async loadCachedModels() {
    try {
      const cached = await new Promise((resolve) => {
        chrome.storage.local.get(
          ["claudeModels", "claudeModelsLastUpdate"],
          (result) => {
            if (chrome.runtime.lastError) {
              console.log(
                "⚠️ Erreur lecture cache modèles:",
                chrome.runtime.lastError
              );
              resolve({});
            } else {
              resolve(result);
            }
          }
        );
      });

      if (cached.claudeModels && Array.isArray(cached.claudeModels)) {
        this.models = cached.claudeModels;
        this.lastUpdate = cached.claudeModelsLastUpdate
          ? new Date(cached.claudeModelsLastUpdate)
          : null;
        console.log(`📥 ${this.models.length} modèles chargés depuis le cache`);
      } else {
        console.log(
          "📝 Aucun cache de modèles trouvé, utilisation du fallback"
        );
        this.models = [...this.fallbackModels];
      }
    } catch (error) {
      console.error("❌ Erreur chargement cache modèles:", error);
      this.models = [...this.fallbackModels];
    }
  }

  /**
   * Vérifie si une mise à jour des modèles est nécessaire
   */
  needsUpdate() {
    if (!this.lastUpdate) {
      console.log("🔄 Première utilisation, mise à jour nécessaire");
      return true;
    }

    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime();
    const needsUpdate = timeSinceUpdate > this.updateInterval;

    console.log(`⏰ Dernière mise à jour: ${this.lastUpdate.toLocaleString()}`);
    console.log(
      `⏰ Temps écoulé: ${Math.round(timeSinceUpdate / (1000 * 60 * 60))}h`
    );

    return needsUpdate;
  }

  /**
   * Met à jour la liste des modèles depuis l'API Anthropic
   */
  async updateModels() {
    try {
      console.log("🔄 Récupération des modèles depuis l'API Anthropic...");

      // Récupérer la clé API
      const settings = await new Promise((resolve) => {
        chrome.storage.sync.get(["claudeApiKey"], (result) => {
          if (chrome.runtime.lastError) {
            chrome.storage.local.get(["claudeApiKey"], resolve);
          } else {
            resolve(result);
          }
        });
      });

      if (!settings?.claudeApiKey) {
        console.log("⚠️ Pas de clé API, utilisation des modèles de fallback");
        await this.saveCachedModels(this.fallbackModels);
        return;
      }

      // Appeler l'API pour récupérer les modèles
      const models = await this.fetchModelsFromAPI(settings.claudeApiKey);

      if (models && models.length > 0) {
        this.models = models;
        await this.saveCachedModels(models);
        console.log(`✅ ${models.length} modèles mis à jour depuis l'API`);
      } else {
        console.log("⚠️ API retourne une liste vide, conservation du cache");
      }
    } catch (error) {
      console.error("❌ Erreur mise à jour modèles:", error);
      console.log("📝 Conservation des modèles actuels");
    }
  }

  /**
   * Récupère les modèles depuis l'API Anthropic
   */
  async fetchModelsFromAPI(apiKey) {
    try {
      console.log("📡 Appel API pour récupérer les modèles...");

      const response = await fetch("https://api.anthropic.com/v1/models", {
        method: "GET",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.log(
            "⚠️ Endpoint /models non disponible, utilisation de la détection alternative"
          );
          return await this.detectModelsAlternative(apiKey);
        }
        throw new Error(
          `Erreur API: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("📨 Réponse API modèles:", data);

      if (data.data && Array.isArray(data.data)) {
        return this.parseApiModels(data.data);
      } else {
        console.log(
          "⚠️ Format API inattendu, utilisation de la détection alternative"
        );
        return await this.detectModelsAlternative(apiKey);
      }
    } catch (error) {
      console.error("❌ Erreur appel API modèles:", error);
      // Si l'API ne fonctionne pas, essayer la détection alternative
      return await this.detectModelsAlternative(apiKey);
    }
  }

  /**
   * Détection alternative des modèles par test direct
   */
  async detectModelsAlternative(apiKey) {
    console.log("🔍 Détection alternative des modèles...");

    const knownModels = [
      // Claude 3 Family
      {
        id: "claude-3-haiku-20240307",
        family: "claude-3",
        name: "Claude 3 Haiku",
      },
      {
        id: "claude-3-sonnet-20240229",
        family: "claude-3",
        name: "Claude 3 Sonnet",
      },
      {
        id: "claude-3-opus-20240229",
        family: "claude-3",
        name: "Claude 3 Opus",
      },

      // Claude 3.5 Family
      {
        id: "claude-3-5-sonnet-20240620",
        family: "claude-3.5",
        name: "Claude 3.5 Sonnet (Juin)",
      },
      {
        id: "claude-3-5-sonnet-20241022",
        family: "claude-3.5",
        name: "Claude 3.5 Sonnet (Octobre)",
      },
      {
        id: "claude-3-5-haiku-20241022",
        family: "claude-3.5",
        name: "Claude 3.5 Haiku",
      },

      // Claude 4 Family (potentiels futurs modèles)
      {
        id: "claude-4-sonnet-20250514",
        family: "claude-4",
        name: "Claude 4 Sonnet",
      },
      {
        id: "claude-4-opus-20250514",
        family: "claude-4",
        name: "Claude 4 Opus",
      },
    ];

    const availableModels = [];

    for (const model of knownModels) {
      try {
        console.log(`🧪 Test du modèle: ${model.id}`);

        const isAvailable = await this.testModel(apiKey, model.id);

        if (isAvailable) {
          const modelInfo = this.createModelInfo(model);
          availableModels.push(modelInfo);
          console.log(`✅ Modèle disponible: ${model.name}`);
        } else {
          console.log(`❌ Modèle non disponible: ${model.name}`);
        }

        // Délai entre les tests pour éviter les rate limits
        await this.delay(500);
      } catch (error) {
        console.log(`⚠️ Erreur test ${model.id}:`, error.message);
      }
    }

    // S'assurer qu'on a au moins les modèles de base
    if (availableModels.length === 0) {
      console.log("⚠️ Aucun modèle détecté, utilisation du fallback");
      return [...this.fallbackModels];
    }

    // Marquer le modèle par défaut
    this.setDefaultModel(availableModels);

    console.log(
      `✅ Détection alternative terminée: ${availableModels.length} modèles`
    );
    return availableModels;
  }

  /**
   * Test si un modèle est disponible
   */
  async testModel(apiKey, modelId) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 10,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      // Un modèle existe si on a une réponse 2xx ou une erreur qui n'est pas 404
      if (response.ok) {
        return true;
      }

      // Vérifier le type d'erreur
      if (response.status === 404) {
        return false; // Modèle n'existe pas
      }

      if (response.status === 400) {
        // Erreur de validation, le modèle existe probablement
        const errorText = await response.text();
        if (errorText.includes("model") && errorText.includes("not found")) {
          return false;
        }
        return true;
      }

      // Autres erreurs (401, 403, 429, 500) : modèle existe probablement
      return true;
    } catch (error) {
      console.log(`⚠️ Erreur test modèle ${modelId}:`, error.message);
      return false;
    }
  }

  /**
   * Parse les modèles retournés par l'API officielle
   */
  parseApiModels(apiModels) {
    console.log("📝 Parsing des modèles de l'API...");

    return apiModels
      .filter((model) => model.id && model.id.startsWith("claude-"))
      .map((model) => this.createModelInfoFromAPI(model))
      .sort((a, b) => {
        // Trier par famille puis par date
        if (a.family !== b.family) {
          return a.family.localeCompare(b.family);
        }
        return a.id.localeCompare(b.id);
      });
  }

  /**
   * Crée un objet modèle à partir des données API
   */
  createModelInfoFromAPI(apiModel) {
    const family = this.extractFamily(apiModel.id);
    const name = this.generateDisplayName(apiModel.id);

    return {
      id: apiModel.id,
      name: name,
      family: family,
      capabilities: apiModel.capabilities || ["text"],
      maxTokens: apiModel.max_tokens || this.getDefaultMaxTokens(family),
      isDefault: false, // Sera défini par setDefaultModel
      apiData: apiModel,
    };
  }

  /**
   * Crée un objet modèle à partir des données de détection
   */
  createModelInfo(modelData) {
    return {
      id: modelData.id,
      name: modelData.name,
      family: modelData.family,
      capabilities: ["text"],
      maxTokens: this.getDefaultMaxTokens(modelData.family),
      isDefault: false, // Sera défini par setDefaultModel
    };
  }

  /**
   * Extrait la famille du modèle depuis son ID
   */
  extractFamily(modelId) {
    if (modelId.includes("claude-4")) return "claude-4";
    if (modelId.includes("claude-3-5")) return "claude-3.5";
    if (modelId.includes("claude-3")) return "claude-3";
    return "claude";
  }

  /**
   * Génère un nom d'affichage pour le modèle
   */
  generateDisplayName(modelId) {
    // Extraire les informations du nom du modèle
    if (modelId.includes("claude-4")) {
      if (modelId.includes("sonnet")) return "Claude 4 Sonnet";
      if (modelId.includes("opus")) return "Claude 4 Opus";
      if (modelId.includes("haiku")) return "Claude 4 Haiku";
    }

    if (modelId.includes("claude-3-5")) {
      if (modelId.includes("sonnet")) {
        if (modelId.includes("20241022")) return "Claude 3.5 Sonnet (Octobre)";
        if (modelId.includes("20240620")) return "Claude 3.5 Sonnet (Juin)";
        return "Claude 3.5 Sonnet";
      }
      if (modelId.includes("haiku")) return "Claude 3.5 Haiku";
      if (modelId.includes("opus")) return "Claude 3.5 Opus";
    }

    if (modelId.includes("claude-3")) {
      if (modelId.includes("sonnet")) return "Claude 3 Sonnet";
      if (modelId.includes("opus")) return "Claude 3 Opus";
      if (modelId.includes("haiku")) return "Claude 3 Haiku";
    }

    // Fallback: capitaliser l'ID
    return modelId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Retourne le nombre de tokens par défaut selon la famille
   */
  getDefaultMaxTokens(family) {
    switch (family) {
      case "claude-4":
        return 8192;
      case "claude-3.5":
        return 8192;
      case "claude-3":
        return 4096;
      default:
        return 4096;
    }
  }

  /**
   * Définit le modèle par défaut dans la liste
   */
  setDefaultModel(models) {
    // Réinitialiser tous les defaults
    models.forEach((model) => (model.isDefault = false));

    // Trouver tous les modèles Haiku disponibles
    const haikuModels = models.filter((model) => model.id.includes("haiku"));

    if (haikuModels.length > 0) {
      // Trier les modèles Haiku par famille (ordre croissant) puis par date
      haikuModels.sort((a, b) => {
        // D'abord par famille
        const familyOrder = {
          "claude-3": 3,
          "claude-3.5": 3.5,
          "claude-4": 4,
        };
        const aFamilyOrder = familyOrder[a.family] || 99;
        const bFamilyOrder = familyOrder[b.family] || 99;

        if (aFamilyOrder !== bFamilyOrder) {
          return bFamilyOrder - aFamilyOrder; // Ordre décroissant pour avoir le plus récent
        }

        // Puis par ID (pour avoir la version la plus récente)
        return b.id.localeCompare(a.id);
      });

      // Sélectionner le dernier Haiku (le plus récent)
      const latestHaiku = haikuModels[0];
      latestHaiku.isDefault = true;
      console.log(
        `🎯 Modèle par défaut: ${latestHaiku.name} (dernier Haiku disponible)`
      );
      return;
    }

    // Fallback si aucun Haiku: priorités classiques
    const priorities = [
      "claude-3-5-sonnet-20241022",
      "claude-3-5-sonnet-20240620",
      "claude-3-sonnet-20240229",
      "claude-4-sonnet",
    ];

    for (const priority of priorities) {
      const model = models.find((m) =>
        m.id.includes(priority.split("-").slice(0, -1).join("-"))
      );
      if (model) {
        model.isDefault = true;
        console.log(`🎯 Modèle par défaut (fallback): ${model.name}`);
        return;
      }
    }

    // Dernier fallback: premier modèle
    if (models.length > 0) {
      models[0].isDefault = true;
      console.log(`🎯 Modèle par défaut (dernier fallback): ${models[0].name}`);
    }
  }

  /**
   * Sauvegarde les modèles dans le cache
   */
  async saveCachedModels(models) {
    try {
      const cacheData = {
        claudeModels: models,
        claudeModelsLastUpdate: new Date().toISOString(),
      };

      await new Promise((resolve, reject) => {
        chrome.storage.local.set(cacheData, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });

      this.lastUpdate = new Date();
      console.log("💾 Modèles sauvegardés dans le cache");
    } catch (error) {
      console.error("❌ Erreur sauvegarde cache modèles:", error);
    }
  }

  /**
   * Force la mise à jour des modèles
   */
  async forceUpdate() {
    console.log("🔄 Mise à jour forcée des modèles...");
    this.lastUpdate = null;
    await this.updateModels();
    return this.models;
  }

  /**
   * Retourne la liste des modèles disponibles
   */
  getModels() {
    return this.models;
  }

  /**
   * Retourne le modèle par défaut
   */
  getDefaultModel() {
    return this.models.find((model) => model.isDefault) || this.models[0];
  }

  /**
   * Trouve un modèle par son ID
   */
  getModelById(modelId) {
    return this.models.find((model) => model.id === modelId);
  }

  /**
   * Retourne les modèles groupés par famille
   */
  getModelsByFamily() {
    const families = {};

    this.models.forEach((model) => {
      if (!families[model.family]) {
        families[model.family] = [];
      }
      families[model.family].push(model);
    });

    return families;
  }

  /**
   * Délai utilitaire
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Nettoie le cache des modèles
   */
  async clearCache() {
    try {
      await new Promise((resolve) => {
        chrome.storage.local.remove(
          ["claudeModels", "claudeModelsLastUpdate"],
          resolve
        );
      });
      console.log("🗑️ Cache modèles nettoyé");
    } catch (error) {
      console.error("❌ Erreur nettoyage cache:", error);
    }
  }
}

// Instance globale
let modelManager = null;

/**
 * Initialise le gestionnaire de modèles
 */
async function initModelManager() {
  if (!modelManager) {
    modelManager = new ModelManager();
  }

  const models = await modelManager.init();
  return models;
}

/**
 * Raccourci pour obtenir la liste des modèles
 */
function getAvailableModels() {
  return modelManager ? modelManager.getModels() : [];
}

/**
 * Raccourci pour obtenir le modèle par défaut
 */
function getDefaultModel() {
  return modelManager ? modelManager.getDefaultModel() : null;
}

/**
 * Raccourci pour forcer la mise à jour
 */
async function updateModels() {
  return modelManager ? await modelManager.forceUpdate() : [];
}

/**
 * Peuple un élément select avec les modèles disponibles
 */
function populateModelSelect(selectElement, selectedModelId = null) {
  if (!selectElement || !modelManager) {
    console.error(
      "❌ Impossible de peupler le select: élément ou manager manquant"
    );
    return;
  }

  const models = modelManager.getModels();
  const families = modelManager.getModelsByFamily();

  // Vider le select
  selectElement.innerHTML = "";

  // Trier les familles par ordre croissant (3 > 3.5 > 4 > suivants)
  const sortedFamilies = Object.keys(families).sort((a, b) => {
    const orderMap = { "claude-3": 3, "claude-3.5": 3.5, "claude-4": 4 };
    const aOrder = orderMap[a] || 99;
    const bOrder = orderMap[b] || 99;
    return aOrder - bOrder;
  });

  // Ajouter les modèles groupés par famille
  sortedFamilies.forEach((family) => {
    if (sortedFamilies.length > 1) {
      // Ajouter un header de groupe si plusieurs familles
      const optgroup = document.createElement("optgroup");
      optgroup.label = family.charAt(0).toUpperCase() + family.slice(1);
      selectElement.appendChild(optgroup);

      // Trier les modèles dans chaque famille par nom
      const sortedModels = families[family].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      sortedModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        option.selected = selectedModelId
          ? model.id === selectedModelId
          : model.isDefault;
        optgroup.appendChild(option);
      });
    } else {
      // Si une seule famille, ajouter directement
      const sortedModels = families[family].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      sortedModels.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = model.name;
        option.selected = selectedModelId
          ? model.id === selectedModelId
          : model.isDefault;
        selectElement.appendChild(option);
      });
    }
  });

  console.log(`✅ Select peuplé avec ${models.length} modèles`);
}

// Export pour utilisation dans d'autres fichiers
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ModelManager,
    initModelManager,
    getAvailableModels,
    getDefaultModel,
    updateModels,
    populateModelSelect,
  };
}

// Export global - ModelManager est maintenant défini
window.ModelManager = ModelManager;
window.initModelManager = initModelManager;
window.getAvailableModels = getAvailableModels;
window.getDefaultModel = getDefaultModel;
window.updateModels = updateModels;
window.populateModelSelect = populateModelSelect;

// Fonction async pour les logs uniquement
(async function () {
  const logger = await getLogger();

  logger.info("Model Manager chargé");
  logger.info("✅ Model Manager défini globalement");
})().catch(console.error);
