/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// options.js - Version universelle avec gestion individuelle des prompts

(async function () {
  const logger = await getLogger();

  logger.info("🔧 Options.js chargé");

  // Fonction utilitaire pour filtrer les prompts système non vides
  function filterAvailableSystemPrompts(systemPrompts) {
    if (!systemPrompts || typeof systemPrompts !== "object") {
      return {};
    }

    const filteredPrompts = {};

    // Filtrer seulement les prompts qui ne sont pas vides
    Object.keys(systemPrompts).forEach((key) => {
      const prompt = systemPrompts[key];
      if (prompt && typeof prompt === "string" && prompt.trim().length > 0) {
        filteredPrompts[key] = prompt;
      }
    });

    return filteredPrompts;
  }

  const DEFAULT_PROMPTS = {
    summary:
      "Fais un résumé complet et structuré de ce contenu. Utilise des titres et sous-titres en markdown.",
    key_points:
      "Extrais et liste les points clés de ce contenu sous forme de liste à puces organisée.",
    analysis:
      "Fais une analyse détaillée de ce contenu en expliquant les idées principales, les arguments, et les implications.",
    questions:
      "Génère une série de questions importantes avec leurs réponses basées sur ce contenu.",
    translation:
      "Traduis ce contenu dans la langue de réponse sélectionnée par l'utilisateur en gardant le sens et le contexte original.",
    explanation:
      "Explique ce contenu de manière simple et accessible, comme si tu t'adressais à un débutant.",
  };

  // Fonction d'internationalisation
  function i18n(key, params = {}) {
    let message = chrome.i18n.getMessage(key, params);
    return message || key;
  }

  // Initialiser les traductions
  function initializeI18n() {
    logger.info("🌍 Initialisation i18n options...");

    document.title = i18n("optionsTitle");

    const elementsToTranslate = document.querySelectorAll("[data-i18n]");
    elementsToTranslate.forEach((element) => {
      const key = element.getAttribute("data-i18n");
      const translation = i18n(key);

      if (element.tagName === "OPTION") {
        element.textContent = translation;
      } else if (element.tagName === "INPUT" && element.type === "submit") {
        element.value = translation;
      } else {
        element.textContent = translation;
      }
    });

    const elementsWithPlaceholder = document.querySelectorAll(
      "[data-i18n-placeholder]"
    );
    elementsWithPlaceholder.forEach((element) => {
      const key = element.getAttribute("data-i18n-placeholder");
      const translation = i18n(key);
      element.placeholder = translation;
    });

    logger.info("✅ i18n options initialisé");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    logger.info("✅ DOM chargé");

    initializeI18n();

    const form = document.getElementById("optionsForm");
    const claudeApiKeyInput = document.getElementById("claudeApiKey");
    const pipedApiUrlInput = document.getElementById("pipedApiUrl");
    const claudeModelSelect = document.getElementById("claudeModel");
    const summaryLanguageSelect = document.getElementById("summaryLanguage");
    const defaultAnalysisTypeSelect = document.getElementById(
      "defaultAnalysisType"
    );
    const testApiBtn = document.getElementById("testApiBtn");
    const testPipedBtn = document.getElementById("testPipedBtn");
    const clearDataBtn = document.getElementById("clearDataBtn");
    const messageDiv = document.getElementById("message");
    const apiKeyStatus = document.getElementById("apiKeyStatus");
    const apiUrlStatus = document.getElementById("apiUrlStatus");
    const themeSelect = document.getElementById("themeSelect");
    const debugModeCheckbox = document.getElementById("debugModeCheckbox");

    // Éléments de la section avancée
    const advancedToggle = document.getElementById("advancedToggle");
    const advancedContent = document.getElementById("advancedContent");
    const advancedArrow = document.getElementById("advancedArrow");
    const promptSummary = document.getElementById("promptSummary");
    const promptKeyPoints = document.getElementById("promptKeyPoints");
    const promptAnalysis = document.getElementById("promptAnalysis");
    const promptQuestions = document.getElementById("promptQuestions");
    const promptTranslation = document.getElementById("promptTranslation");
    const promptExplanation = document.getElementById("promptExplanation");
    const customPromptsList = document.getElementById("customPromptsList");
    const newPromptTitle = document.getElementById("newPromptTitle");
    const newPromptContent = document.getElementById("newPromptContent");
    const addPromptBtn = document.getElementById("addPromptBtn");

    const browserAPI = typeof browser !== "undefined" ? browser : chrome;
    logger.info(
      "🌐 API utilisée:",
      typeof browser !== "undefined" ? "browser" : "chrome"
    );

    // Initialisation des gestionnaires
    await initVersionManager();
    await initThemeManager();
    await initModelManager();
    await loadOptions();

    // Event listeners de base
    if (form) {
      form.addEventListener("submit", saveOptions);
      logger.info("📋 Form listener ajouté");
    }

    if (testApiBtn) {
      testApiBtn.addEventListener("click", testClaudeApi);
      logger.info("🧪 Test Claude button listener ajouté");
    }

    if (testPipedBtn) {
      testPipedBtn.addEventListener("click", testPipedApi);
      logger.info("🔗 Test Piped button listener ajouté");
    }

    if (clearDataBtn) {
      clearDataBtn.addEventListener("click", clearAllData);
      logger.info("🗑️ Clear button listener ajouté");
    }

    const updateModelsBtn = document.getElementById("updateModelsBtn");
    if (updateModelsBtn) {
      updateModelsBtn.addEventListener("click", forceUpdateModels);
      logger.info("🔄 Update models button listener ajouté");
    }

    if (claudeApiKeyInput) {
      claudeApiKeyInput.addEventListener("input", () => {
        updateApiKeyStatus();
        if (testApiBtn) {
          updateTestButtonState(testApiBtn, "default", "🧪 Test");
        }
      });
      logger.info("🔑 API key input listener ajouté");
    }

    if (pipedApiUrlInput) {
      pipedApiUrlInput.addEventListener("input", () => {
        updateApiUrlStatus();
        if (testPipedBtn) {
          updateTestButtonState(testPipedBtn, "default", "🔗 Test");
        }
      });
      logger.info("🔗 Piped URL input listener ajouté");
    }

    // Event listeners pour la section avancée
    if (advancedToggle) {
      advancedToggle.addEventListener("click", toggleAdvanced);
      logger.info("⚙️ Advanced toggle listener ajouté");
    }

    if (addPromptBtn) {
      addPromptBtn.addEventListener("click", addCustomPrompt);
      logger.info("➕ Add prompt listener ajouté");
    }

    if (themeSelect) {
      themeSelect.addEventListener("change", handleThemeChange);
      logger.info("🎨 Theme selector listener ajouté");
    }

    if (exportLogsBtn) {
      exportLogsBtn.addEventListener("click", exportLogs);
      logger.info("📄 Export logs listener ajouté");
    }

    // Event listeners pour la gestion individuelle des prompts
    setupIndividualPromptListeners();

    function setupIndividualPromptListeners() {
      // Boutons de restauration des prompts par défaut
      const restoreButtons = document.querySelectorAll(".restore-prompt-btn");
      restoreButtons.forEach((button) => {
        button.addEventListener("click", handleRestorePrompt);
      });

      // Boutons de suppression des prompts par défaut
      const deleteButtons = document.querySelectorAll(".delete-prompt-btn");
      deleteButtons.forEach((button) => {
        button.addEventListener("click", handleDeletePrompt);
      });

      logger.info(
        `✅ Event listeners ajoutés pour ${restoreButtons.length} boutons de restauration et ${deleteButtons.length} boutons de suppression`
      );
    }

    async function handleRestorePrompt(event) {
      const promptType = event.target.getAttribute("data-prompt-type");
      if (!promptType) {
        showMessage("❌ Type de prompt non spécifié", "error");
        return;
      }

      try {
        const textarea = document.getElementById(
          `prompt${capitalizeFirst(promptType.replace("_", ""))}`
        );
        if (!textarea) {
          // Pour key_points, le textarea s'appelle promptKeyPoints
          const alternateId = `prompt${promptType
            .split("_")
            .map(capitalizeFirst)
            .join("")}`;
          const alternateTextarea = document.getElementById(alternateId);
          if (alternateTextarea) {
            alternateTextarea.value = DEFAULT_PROMPTS[promptType];
            showMessage(
              `✅ Prompt "${promptType}" restauré à sa valeur par défaut!`,
              "success"
            );
          } else {
            showMessage(
              `❌ Élément textarea non trouvé pour "${promptType}"`,
              "error"
            );
          }
          return;
        }

        if (DEFAULT_PROMPTS[promptType]) {
          textarea.value = DEFAULT_PROMPTS[promptType];
          showMessage(
            `✅ Prompt "${promptType}" restauré à sa valeur par défaut!`,
            "success"
          );
          logger.info(`🔄 Prompt ${promptType} restauré`);
        } else {
          showMessage(
            `❌ Valeur par défaut non trouvée pour "${promptType}"`,
            "error"
          );
        }
      } catch (error) {
        logger.error("❌ Erreur restauration prompt:", error);
        showMessage(
          `❌ Erreur lors de la restauration: ${error.message}`,
          "error"
        );
      }
    }

    async function handleDeletePrompt(event) {
      const promptType = event.target.getAttribute("data-prompt-type");
      if (!promptType) {
        showMessage("❌ Type de prompt non spécifié", "error");
        return;
      }

      if (
        !confirm(
          `⚠️ Êtes-vous sûr de vouloir supprimer le prompt "${promptType}" ? Il sera vidé et ne sera plus disponible dans l'extension.`
        )
      ) {
        return;
      }

      try {
        const textarea = document.getElementById(
          `prompt${capitalizeFirst(promptType.replace("_", ""))}`
        );
        if (!textarea) {
          // Pour key_points, le textarea s'appelle promptKeyPoints
          const alternateId = `prompt${promptType
            .split("_")
            .map(capitalizeFirst)
            .join("")}`;
          const alternateTextarea = document.getElementById(alternateId);
          if (alternateTextarea) {
            alternateTextarea.value = "";
            showMessage(`🗑️ Prompt "${promptType}" supprimé!`, "success");
          } else {
            showMessage(
              `❌ Élément textarea non trouvé pour "${promptType}"`,
              "error"
            );
          }
          return;
        }

        textarea.value = "";
        showMessage(`🗑️ Prompt "${promptType}" supprimé!`, "success");
        logger.info(`🗑️ Prompt ${promptType} supprimé`);
      } catch (error) {
        logger.error("❌ Erreur suppression prompt:", error);
        showMessage(
          `❌ Erreur lors de la suppression: ${error.message}`,
          "error"
        );
      }
    }

    function capitalizeFirst(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async function loadOptions() {
      try {
        logger.info("📥 Chargement des options...");

        // Peupler le select des modèles avec les modèles détectés
        if (claudeModelSelect) {
          populateModelSelect(claudeModelSelect);
        }

        const result = await browserAPI.storage.sync.get([
          "claudeApiKey",
          "pipedApiUrl",
          "claudeModel",
          "summaryLanguage",
          "defaultAnalysisType",
          "customPrompts",
          "systemPrompts",
          "theme",
          "debugMode",
        ]);

        const options = result || {};

        logger.info("📋 Options chargées:", {
          hasApiKey: !!options.claudeApiKey,
          apiKeyLength: options.claudeApiKey ? options.claudeApiKey.length : 0,
          pipedApiUrl: options.pipedApiUrl,
          model: options.claudeModel,
          language: options.summaryLanguage,
          customPromptsCount: options.customPrompts
            ? options.customPrompts.length
            : 0,
          hasSystemPrompts: !!options.systemPrompts,
        });

        // Charger les options de base
        if (options.claudeApiKey && claudeApiKeyInput) {
          claudeApiKeyInput.value = options.claudeApiKey;
          updateApiKeyStatus();
        }

        if (options.pipedApiUrl && pipedApiUrlInput) {
          pipedApiUrlInput.value = options.pipedApiUrl;
          updateApiUrlStatus();
        }

        if (claudeModelSelect && options.claudeModel) {
          const modelExists = Array.from(claudeModelSelect.options).some(
            (option) => option.value === options.claudeModel
          );
          if (modelExists) {
            claudeModelSelect.value = options.claudeModel;
          } else {
            logger.info(
              `⚠️ Modèle sauvegardé ${options.claudeModel} non disponible, utilisation du défaut`
            );
          }
        }

        if (summaryLanguageSelect) {
          summaryLanguageSelect.value = options.summaryLanguage || "fr";
        }

        if (defaultAnalysisTypeSelect) {
          defaultAnalysisTypeSelect.value =
            options.defaultAnalysisType || "summary";
        }

        if (themeSelect) {
          themeSelect.value = options.theme || "auto";
        }

        if (debugModeCheckbox) {
          debugModeCheckbox.checked = options.debugMode === "verbose";
        }

        // Charger les prompts système - TOUJOURS afficher les valeurs par défaut au minimum
        const systemPrompts = options.systemPrompts || {};

        // Pré-remplir avec les valeurs par défaut pour que l'utilisateur puisse les voir et modifier
        if (promptSummary)
          promptSummary.value =
            systemPrompts.summary || DEFAULT_PROMPTS.summary;
        if (promptKeyPoints)
          promptKeyPoints.value =
            systemPrompts.key_points || DEFAULT_PROMPTS.key_points;
        if (promptAnalysis)
          promptAnalysis.value =
            systemPrompts.analysis || DEFAULT_PROMPTS.analysis;
        if (promptQuestions)
          promptQuestions.value =
            systemPrompts.questions || DEFAULT_PROMPTS.questions;
        if (promptTranslation)
          promptTranslation.value =
            systemPrompts.translation || DEFAULT_PROMPTS.translation;
        if (promptExplanation)
          promptExplanation.value =
            systemPrompts.explanation || DEFAULT_PROMPTS.explanation;

        // Charger les prompts personnalisés
        // Charger les prompts personnalisés
        const customPrompts = options.customPrompts || [];
        renderCustomPrompts(customPrompts);

        // Peupler le select de type d'analyse par défaut
        const availableSystemPrompts =
          filterAvailableSystemPrompts(systemPrompts);
        await populateDefaultAnalysisTypeSelect(
          availableSystemPrompts,
          customPrompts,
          options.defaultAnalysisType || "summary"
        );
      } catch (error) {
        logger.error("❌ Erreur chargement options:", error);
        showMessage(
          i18n("errorLoadingOptions") + ": " + error.message,
          "error"
        );
      }
    }

    async function saveOptions(e) {
      e.preventDefault();
      logger.info("💾 Tentative de sauvegarde...");

      try {
        const options = {
          claudeApiKey: claudeApiKeyInput ? claudeApiKeyInput.value.trim() : "",
          pipedApiUrl: pipedApiUrlInput ? pipedApiUrlInput.value.trim() : "",
          claudeModel: claudeModelSelect
            ? claudeModelSelect.value
            : "claude-3-5-sonnet-20241022",
          summaryLanguage: summaryLanguageSelect
            ? summaryLanguageSelect.value
            : "fr",
          defaultAnalysisType: defaultAnalysisTypeSelect
            ? defaultAnalysisTypeSelect.value
            : "summary",
          theme: themeSelect ? themeSelect.value : "auto",
          debugMode:
            debugModeCheckbox && debugModeCheckbox.checked
              ? "verbose"
              : "normal",
        };

        // Ajouter les prompts système s'ils sont modifiés
        options.systemPrompts = {
          summary: promptSummary
            ? promptSummary.value.trim()
            : DEFAULT_PROMPTS.summary,
          key_points: promptKeyPoints
            ? promptKeyPoints.value.trim()
            : DEFAULT_PROMPTS.key_points,
          analysis: promptAnalysis
            ? promptAnalysis.value.trim()
            : DEFAULT_PROMPTS.analysis,
          questions: promptQuestions
            ? promptQuestions.value.trim()
            : DEFAULT_PROMPTS.questions,
          translation: promptTranslation
            ? promptTranslation.value.trim()
            : DEFAULT_PROMPTS.translation,
          explanation: promptExplanation
            ? promptExplanation.value.trim()
            : DEFAULT_PROMPTS.explanation,
        };

        // Récupérer les prompts personnalisés existants
        const existingData = await browserAPI.storage.sync.get([
          "customPrompts",
        ]);
        if (existingData.customPrompts) {
          options.customPrompts = existingData.customPrompts;
        }

        logger.info("📋 Options à sauvegarder:", {
          hasApiKey: !!options.claudeApiKey,
          apiKeyLength: options.claudeApiKey.length,
          pipedApiUrl: options.pipedApiUrl,
          model: options.claudeModel,
          language: options.summaryLanguage,
          hasSystemPrompts: !!options.systemPrompts,
          customPromptsCount: options.customPrompts
            ? options.customPrompts.length
            : 0,
        });

        if (!options.claudeApiKey) {
          showMessage(i18n("errorApiKeyRequired"), "error");
          return;
        }

        if (
          options.pipedApiUrl &&
          options.pipedApiUrl.trim() &&
          !options.pipedApiUrl.startsWith("http")
        ) {
          showMessage(i18n("errorPipedUrlFormat"), "error");
          return;
        }

        if (!options.claudeApiKey.startsWith("sk-ant-api")) {
          showMessage(i18n("errorApiKeyFormat"), "error");
          return;
        }

        logger.info("💾 Sauvegarde dans storage.sync...");
        await browserAPI.storage.sync.set(options);

        logger.info("💾 Sauvegarde dans storage.local...");
        await browserAPI.storage.local.set(options);

        logger.info("✅ Sauvegarde réussie dans les deux storages");

        showMessage(i18n("settingsSaved"), "success");
        updateApiKeyStatus();
        updateApiUrlStatus();
      } catch (error) {
        logger.error("❌ Erreur sauvegarde:", error);
        showMessage(i18n("errorSaving") + ": " + error.message, "error");
      }
    }

    async function testClaudeApi() {
      logger.info("🧪 Test de l'API Claude...");

      const apiKey = claudeApiKeyInput ? claudeApiKeyInput.value.trim() : "";

      if (!apiKey) {
        showClaudeTestResult(i18n("errorApiKeyRequired"), "error");
        updateTestButtonState(testApiBtn, "error", "🧪 Test");
        return;
      }

      if (testApiBtn) {
        updateTestButtonState(testApiBtn, "loading", "🔄 Test...");
      }

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
            model: "claude-3-haiku-20240307",
            max_tokens: 50,
            messages: [
              {
                role: "user",
                content: i18n("testPrompt"),
              },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          logger.info("✅ Test API réussi:", data);
          showClaudeTestResult(i18n("claudeApiWorking"), "success");
          updateTestButtonState(testApiBtn, "success", "✅ Test");
        } else {
          const errorText = await response.text();
          logger.error("❌ Erreur API:", response.status, errorText);
          showClaudeTestResult(
            i18n("apiError") + `: ${response.status} ${response.statusText}`,
            "error"
          );
          updateTestButtonState(testApiBtn, "error", "❌ Test");
        }
      } catch (error) {
        logger.error("❌ Erreur connexion:", error);
        showClaudeTestResult(
          i18n("connectionError") + `: ${error.message}`,
          "error"
        );
        updateTestButtonState(testApiBtn, "error", "❌ Test");
      } finally {
        if (
          testApiBtn &&
          !testApiBtn.classList.contains("test-success") &&
          !testApiBtn.classList.contains("test-error")
        ) {
          updateTestButtonState(testApiBtn, "default", "🧪 Test");
        }
      }
    }

    async function testPipedApi() {
      logger.info("🔗 Test de l'API Piped...");

      const apiUrl = pipedApiUrlInput ? pipedApiUrlInput.value.trim() : "";

      if (!apiUrl) {
        showPipedTestResult(i18n("errorPipedUrlRequired"), "error");
        updateTestButtonState(testPipedBtn, "error", "🔗 Test");
        return;
      }

      if (testPipedBtn) {
        updateTestButtonState(testPipedBtn, "loading", "🔄 Test...");
      }

      try {
        const testVideoId = "dQw4w9WgXcQ";
        let testUrl = apiUrl;

        if (!testUrl.endsWith("/api")) {
          if (!testUrl.endsWith("/")) {
            testUrl += "/api";
          } else {
            testUrl += "api";
          }
        }

        const response = await fetch(`${testUrl}/streams/${testVideoId}`);

        if (response.ok) {
          const data = await response.json();
          logger.info("✅ Test API Piped réussi:", data);
          showPipedTestResult(
            i18n("pipedApiWorking") +
              ` ${i18n("videoFound")}: "${
                data.title || i18n("titleAvailable")
              }"`,
            "success"
          );
          updateTestButtonState(testPipedBtn, "success", "✅ Test");
        } else {
          if (response.status === 404) {
            showPipedTestResult(
              i18n("pipedApiAccessible") +
                ` (${response.status}). ${i18n("apiSeemsFunctional")}.`,
              "success"
            );
            updateTestButtonState(testPipedBtn, "success", "✅ Test");
          } else if (response.status === 502) {
            showPipedTestResult(i18n("error502Message"), "error");
            updateTestButtonState(testPipedBtn, "error", "❌ Test");
          } else if (response.status >= 500) {
            showPipedTestResult(
              i18n("serverError") +
                ` ${response.status} - ${i18n("serverErrorMessage")}`,
              "error"
            );
            updateTestButtonState(testPipedBtn, "error", "❌ Test");
          } else {
            showPipedTestResult(
              i18n("pipedApiError") +
                `: ${response.status} ${response.statusText}`,
              "error"
            );
            updateTestButtonState(testPipedBtn, "error", "❌ Test");
          }
        }
      } catch (error) {
        logger.error("❌ Erreur connexion Piped:", error);
        if (error.message.includes("CORS")) {
          showPipedTestResult(i18n("corsWarning"), "success");
          updateTestButtonState(testPipedBtn, "success", "✅ Test");
        } else {
          showPipedTestResult(
            i18n("connectionError") + `: ${error.message}`,
            "error"
          );
          updateTestButtonState(testPipedBtn, "error", "❌ Test");
        }
      } finally {
        if (
          testPipedBtn &&
          !testPipedBtn.classList.contains("test-success") &&
          !testPipedBtn.classList.contains("test-error")
        ) {
          updateTestButtonState(testPipedBtn, "default", "🔗 Test");
        }
      }
    }

    async function clearAllData() {
      if (confirm(i18n("confirmClearData"))) {
        try {
          logger.info("🗑️ Effacement des données...");
          await browserAPI.storage.sync.clear();

          if (claudeApiKeyInput) claudeApiKeyInput.value = "";
          if (pipedApiUrlInput) pipedApiUrlInput.value = "";
          if (claudeModelSelect)
            claudeModelSelect.value = "claude-3-5-sonnet-20241022";
          if (summaryLanguageSelect) summaryLanguageSelect.value = "fr";
          if (themeSelect) themeSelect.value = "auto";
          if (debugModeCheckbox) debugModeCheckbox.checked = false;

          // Restaurer TOUS les prompts par défaut (effet du bouton "Effacer les données")
          if (promptSummary) promptSummary.value = DEFAULT_PROMPTS.summary;
          if (promptKeyPoints)
            promptKeyPoints.value = DEFAULT_PROMPTS.key_points;
          if (promptAnalysis) promptAnalysis.value = DEFAULT_PROMPTS.analysis;
          if (promptQuestions)
            promptQuestions.value = DEFAULT_PROMPTS.questions;
          if (promptTranslation)
            promptTranslation.value = DEFAULT_PROMPTS.translation;
          if (promptExplanation)
            promptExplanation.value = DEFAULT_PROMPTS.explanation;

          renderCustomPrompts([]);

          updateTestButtonState(testApiBtn, "default", "🧪 Test");
          updateTestButtonState(testPipedBtn, "default", "🔗 Test");

          updateApiKeyStatus();
          updateApiUrlStatus();
          showMessage(i18n("dataCleared"), "success");
          logger.info(
            "✅ Données effacées - tous les prompts restaurés aux valeurs par défaut"
          );
        } catch (error) {
          logger.error("❌ Erreur effacement:", error);
          showMessage(i18n("errorClearing") + ": " + error.message, "error");
        }
      }
    }

    // Fonctions pour la section avancée
    function toggleAdvanced() {
      const isVisible = advancedContent.classList.contains("visible");
      if (isVisible) {
        advancedContent.classList.remove("visible");
        advancedArrow.textContent = "▼";
      } else {
        advancedContent.classList.add("visible");
        advancedArrow.textContent = "▲";
      }
    }

    async function addCustomPrompt() {
      const title = newPromptTitle.value.trim();
      const content = newPromptContent.value.trim();

      if (!title) {
        showMessage("❌ Veuillez entrer un titre pour le prompt", "error");
        return;
      }

      if (!content) {
        showMessage("❌ Veuillez entrer le contenu du prompt", "error");
        return;
      }

      try {
        const result = await browserAPI.storage.sync.get(["customPrompts"]);
        const customPrompts = result.customPrompts || [];

        if (customPrompts.some((p) => p.title === title)) {
          showMessage("❌ Un prompt avec ce titre existe déjà", "error");
          return;
        }

        const newPrompt = {
          id: Date.now().toString(),
          title: title,
          content: content,
          created: new Date().toISOString(),
        };

        customPrompts.push(newPrompt);

        await browserAPI.storage.sync.set({ customPrompts });
        await browserAPI.storage.local.set({ customPrompts });

        renderCustomPrompts(customPrompts);

        newPromptTitle.value = "";
        newPromptContent.value = "";

        showMessage(`✅ Prompt "${title}" ajouté avec succès!`, "success");
        logger.info("✅ Prompt personnalisé ajouté:", newPrompt);
      } catch (error) {
        logger.error("❌ Erreur ajout prompt:", error);
        showMessage("❌ Erreur lors de l'ajout: " + error.message, "error");
      }
    }

    async function deleteCustomPrompt(promptId) {
      if (
        confirm(
          "⚠️ Êtes-vous sûr de vouloir supprimer ce prompt ? Cette action est irréversible."
        )
      ) {
        try {
          const result = await browserAPI.storage.sync.get(["customPrompts"]);
          const customPrompts = result.customPrompts || [];

          const filteredPrompts = customPrompts.filter(
            (p) => p.id !== promptId
          );

          await browserAPI.storage.sync.set({ customPrompts: filteredPrompts });
          await browserAPI.storage.local.set({
            customPrompts: filteredPrompts,
          });

          renderCustomPrompts(filteredPrompts);

          showMessage("🗑️ Prompt supprimé avec succès!", "success");
          logger.info("✅ Prompt personnalisé supprimé:", promptId);
        } catch (error) {
          logger.error("❌ Erreur suppression prompt:", error);
          showMessage(
            "❌ Erreur lors de la suppression: " + error.message,
            "error"
          );
        }
      }
    }

    function renderCustomPrompts(customPrompts) {
      if (!customPromptsList) return;

      if (customPrompts.length === 0) {
        customPromptsList.innerHTML = `
        <p style="text-align: center; color: #6b7280; font-style: italic; padding: 20px;">
          Aucun prompt personnalisé. Utilisez le formulaire ci-dessous pour en créer un.
        </p>
      `;
        return;
      }

      customPromptsList.innerHTML = customPrompts
        .map(
          (prompt) => `
      <div class="custom-prompt-item">
        <h5>${escapeHtml(prompt.title)}</h5>
        <div class="prompt-text">${escapeHtml(prompt.content)}</div>
        <div class="prompt-actions">
          <button type="button" class="danger-btn delete-prompt-btn" data-prompt-id="${
            prompt.id
          }">
            🗑️ Supprimer
          </button>
        </div>
      </div>
    `
        )
        .join("");

      addPromptEventListeners();
    }

    function addPromptEventListeners() {
      const deleteButtons =
        customPromptsList.querySelectorAll(".delete-prompt-btn");
      deleteButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const promptId = button.getAttribute("data-prompt-id");
          deleteCustomPrompt(promptId);
        });
      });
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    async function populateDefaultAnalysisTypeSelect(
      availableSystemPrompts,
      customPrompts,
      selectedDefault
    ) {
      if (!defaultAnalysisTypeSelect) return;

      // Vider le select
      defaultAnalysisTypeSelect.innerHTML = "";

      // Mapping des prompts système par défaut avec leurs infos d'affichage
      const defaultAnalysisTypes = [
        {
          value: "summary",
          text: "📝 Résumé complet",
          i18n: "analysisTypeSummary",
        },
        {
          value: "key_points",
          text: "🎯 Points clés",
          i18n: "analysisTypeKeyPoints",
        },
        {
          value: "analysis",
          text: "🔍 Analyse détaillée",
          i18n: "analysisTypeAnalysis",
        },
        {
          value: "questions",
          text: "❓ Questions/Réponses",
          i18n: "analysisTypeQuestions",
        },
        {
          value: "translation",
          text: "🌍 Traduction",
          i18n: "analysisTypeTranslation",
        },
        {
          value: "explanation",
          text: "💡 Explication simple",
          i18n: "analysisTypeExplanation",
        },
      ];

      // Ajouter seulement les prompts système disponibles (non supprimés)
      defaultAnalysisTypes.forEach((analysisType) => {
        if (availableSystemPrompts[analysisType.value]) {
          const option = document.createElement("option");
          option.value = analysisType.value;
          option.textContent = analysisType.text;
          option.setAttribute("data-i18n", analysisType.i18n);
          defaultAnalysisTypeSelect.appendChild(option);
        }
      });

      // Ajouter les prompts personnalisés
      customPrompts.forEach((prompt) => {
        const option = document.createElement("option");
        option.value = `custom_${prompt.id}`;
        option.textContent = `🎨 ${prompt.title}`;
        defaultAnalysisTypeSelect.appendChild(option);
      });

      // Sélectionner la valeur par défaut
      if (
        selectedDefault &&
        Array.from(defaultAnalysisTypeSelect.options).some(
          (opt) => opt.value === selectedDefault
        )
      ) {
        defaultAnalysisTypeSelect.value = selectedDefault;
      } else {
        defaultAnalysisTypeSelect.value = "summary";
      }

      logger.info(
        `✅ Select de type d'analyse par défaut peuplé avec valeur: ${defaultAnalysisTypeSelect.value}`
      );
    }

    // Fonctions utilitaires
    function updateTestButtonState(button, state, text) {
      if (!button) return;

      button.classList.remove("test-loading", "test-success", "test-error");

      switch (state) {
        case "loading":
          button.classList.add("test-loading");
          button.disabled = true;
          break;
        case "success":
          button.classList.add("test-success");
          button.disabled = false;
          break;
        case "error":
          button.classList.add("test-error");
          button.disabled = false;
          break;
        default:
          button.disabled = false;
          break;
      }

      button.textContent = text;

      if (state === "success" || state === "error") {
        setTimeout(() => {
          if (button.classList.contains(`test-${state}`)) {
            updateTestButtonState(
              button,
              "default",
              state === "success" ? "✅ Test" : "❌ Test"
            );
          }
        }, 5000);
      }
    }

    function updateApiKeyStatus() {
      if (!claudeApiKeyInput || !apiKeyStatus) return;

      const apiKey = claudeApiKeyInput.value.trim();

      if (!apiKey) {
        apiKeyStatus.textContent = i18n("apiKeyNotConfigured");
        apiKeyStatus.style.color = "#dc3545";
      } else if (apiKey.startsWith("sk-ant-api")) {
        apiKeyStatus.textContent = i18n("apiKeyValidFormat");
        apiKeyStatus.style.color = "#28a745";
      } else {
        apiKeyStatus.textContent = i18n("apiKeyInvalidFormat");
        apiKeyStatus.style.color = "#ffc107";
      }
    }

    function updateApiUrlStatus() {
      if (!pipedApiUrlInput || !apiUrlStatus) return;

      const apiUrl = pipedApiUrlInput.value.trim();

      if (!apiUrl) {
        apiUrlStatus.textContent = i18n("pipedapiNotConfigured");
        apiUrlStatus.style.color = "#dc3545";
      } else if (apiUrl.startsWith("http")) {
        apiUrlStatus.textContent = i18n("urlValidFormat");
        apiUrlStatus.style.color = "#28a745";
      } else {
        apiUrlStatus.textContent = i18n("urlInvalidFormat");
        apiUrlStatus.style.color = "#ffc107";
      }
    }

    function showMessage(text, type) {
      if (!messageDiv) return;

      messageDiv.className =
        type === "error" ? "error-message" : "success-message";
      messageDiv.textContent = text;
      messageDiv.style.display = "block";

      setTimeout(() => {
        messageDiv.style.display = "none";
      }, 5000);
    }

    function showClaudeTestResult(text, type) {
      const claudeTestResult = document.getElementById("claudeTestResult");
      if (!claudeTestResult) return;

      claudeTestResult.className = `test-result ${type}`;
      claudeTestResult.textContent = text;
      claudeTestResult.style.display = "block";
    }

    function showPipedTestResult(text, type) {
      const pipedTestResult = document.getElementById("pipedTestResult");
      if (!pipedTestResult) return;

      pipedTestResult.className = `test-result ${type}`;
      pipedTestResult.textContent = text;
      pipedTestResult.style.display = "block";
    }

    async function handleThemeChange() {
      if (!themeSelect) return;

      const selectedTheme = themeSelect.value;
      logger.info("🎨 Changement de thème demandé:", selectedTheme);

      try {
        // Appliquer le thème immédiatement
        const success = await setTheme(selectedTheme);

        if (success) {
          showMessage(
            `✅ Thème "${selectedTheme}" appliqué avec succès!`,
            "success"
          );
          logger.info("✅ Thème changé avec succès");
        } else {
          showMessage("❌ Erreur lors du changement de thème", "error");
          logger.error("❌ Échec du changement de thème");
        }
      } catch (error) {
        logger.error("❌ Erreur changement thème:", error);
        showMessage(`❌ Erreur: ${error.message}`, "error");
      }
    }

    // Fonction pour forcer la mise à jour des modèles
    async function forceUpdateModels() {
      const updateBtn = document.getElementById("updateModelsBtn");

      if (updateBtn) {
        updateBtn.disabled = true;
        updateBtn.textContent = "🔄 Mise à jour...";
      }

      try {
        logger.info("🔄 Force la mise à jour des modèles...");
        showMessage("🔄 Mise à jour des modèles en cours...", "info");

        const models = await updateModels();

        // Repeupler le select avec les nouveaux modèles
        if (claudeModelSelect) {
          const currentValue = claudeModelSelect.value;
          populateModelSelect(claudeModelSelect, currentValue);
        }

        showMessage(
          `✅ ${models.length} modèles mis à jour avec succès!`,
          "success"
        );
        logger.info(
          `✅ Mise à jour des modèles terminée: ${models.length} modèles`
        );
      } catch (error) {
        logger.error("❌ Erreur mise à jour modèles:", error);
        showMessage(`❌ Erreur mise à jour: ${error.message}`, "error");
      } finally {
        if (updateBtn) {
          updateBtn.disabled = false;
          updateBtn.textContent = "🔄 Mettre à jour les modèles";
        }
      }
    }

    async function exportLogs() {
      try {
        logger.info("📄 Export des logs de debug...");

        if (typeof window.logger !== "undefined" && window.logger) {
          window.logger.exportLogs();
          showMessage("✅ Logs exportés vers vos téléchargements!", "success");
        } else {
          const debugInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            extension: {
              name: "Anthropoïd",
              version:
                typeof getExtensionVersion !== "undefined"
                  ? getExtensionVersion()
                  : "inconnu",
            },
            settings: await browserAPI.storage.sync.get([
              "claudeModel",
              "summaryLanguage",
              "theme",
              "debugMode",
            ]),
            note: "Export manuel - Pour un debug complet, activez le mode verbose et reproduisez le problème.",
          };

          const exportString = JSON.stringify(debugInfo, null, 2);
          const blob = new Blob([exportString], { type: "application/json" });
          const url = URL.createObjectURL(blob);

          const a = document.createElement("a");
          a.href = url;
          a.download = `Anthropoïd-debug-${Date.now()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          showMessage("✅ Informations de debug exportées!", "success");
        }
      } catch (error) {
        logger.error("❌ Erreur export logs:", error);
        showMessage(`❌ Erreur lors de l'export: ${error.message}`, "error");
      }
    }
  });

  // Gestion des raccourcis clavier
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      const form = document.getElementById("optionsForm");
      if (form) {
        form.dispatchEvent(new Event("submit"));
      }
    }
  });
})().catch(console.error);
