/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// popup.js - Version classique avec filtrage des prompts supprimés

(async function () {
  const logger = await getLogger();

  logger.info("🎬 Popup Universal chargé");

  document.addEventListener("DOMContentLoaded", async () => {
    logger.info("✅ DOM chargé - Initialisation popup classique");

    // Éléments DOM
    const analyzeBtn = document.getElementById("analyzeBtn");
    const optionsBtn = document.getElementById("optionsBtn");
    const statusDiv = document.getElementById("status");
    const loadingDiv = document.getElementById("loading");
    const loadingText = document.getElementById("loadingText");
    const modelSelect = document.getElementById("modelSelect");
    const languageSelect = document.getElementById("languageSelect");
    const analysisTypeSelect = document.getElementById("analysisTypeSelect");
    const customPromptContainer = document.getElementById(
      "customPromptContainer"
    );
    const customPrompt = document.getElementById("customPrompt");
    const summaryContainer = document.getElementById("summaryContainer");
    const summaryText = document.getElementById("summaryText");
    const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
    const copyTextBtn = document.getElementById("copyTextBtn");
    const resultButtonsRow = document.querySelector(
      ".result-buttons-row.classic"
    );

    // Nouveau bouton pour continuer la conversation
    const continueConversationBtn = document.getElementById(
      "continueConversationBtn"
    );

    // Variables globales
    let currentSummary = "";
    let lastAnalysisData = null; // Pour stocker les données de la dernière analyse

    // Initialisation du gestionnaire de version
    await initVersionManager();

    // Initialisation du thème
    await initThemeManager();

    // Initialisation du gestionnaire de modèles
    await initModelManager();

    // Initialisation
    await initializePopup();

    // Event listeners
    if (analyzeBtn) {
      analyzeBtn.addEventListener("click", performAnalysis);
    }

    if (optionsBtn) {
      optionsBtn.addEventListener("click", openOptions);
    }

    if (copyMarkdownBtn) {
      copyMarkdownBtn.addEventListener("click", copyAsMarkdown);
    }

    if (copyTextBtn) {
      copyTextBtn.addEventListener("click", copyAsText);
    }

    if (analysisTypeSelect) {
      analysisTypeSelect.addEventListener("change", handleAnalysisTypeChange);
    }

    // Nouveau event listener pour le bouton conversation
    if (continueConversationBtn) {
      continueConversationBtn.addEventListener("click", openConversationTab);
    }

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

    async function initializePopup() {
      try {
        logger.info("🔧 Initialisation du popup classique...");

        // Désactiver les boutons par défaut
        if (analyzeBtn) {
          analyzeBtn.disabled = true;
        }
        if (resultButtonsRow) {
          resultButtonsRow.classList.remove("visible");
        }
        // Charger les préférences
        await loadDefaultPreferences();

        // Vérifier la configuration API
        const hasValidConfig = await checkApiConfiguration();
        if (!hasValidConfig) {
          return; // Bouton reste désactivé
        }

        // Activer l'interface
        if (analyzeBtn) {
          analyzeBtn.disabled = false;
        }
      } catch (error) {
        logger.error("❌ Erreur initialisation:", error);
        updateStatus("⚠️ Erreur d'initialisation - Rechargez la page", "error");
      }
    }

    async function checkApiConfiguration() {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "checkApiKey" }, (result) => {
            if (chrome.runtime.lastError) {
              logger.error(
                "❌ Erreur message checkApiKey:",
                chrome.runtime.lastError
              );
              resolve(null);
            } else {
              resolve(result);
            }
          });
        });

        if (!response || !response.success) {
          updateStatus(
            "⚠️ Erreur de configuration. Cliquez sur Options.",
            "error"
          );
          return false;
        }

        if (!response.hasApiKey || !response.isValid) {
          updateStatus(
            "⚠️ Clé API Claude non configurée. Cliquez sur Options.",
            "warning"
          );
          return false;
        }

        return true;
      } catch (error) {
        logger.error("❌ Erreur vérification API:", error);
        updateStatus("⚠️ Erreur de vérification API", "error");
        return false;
      }
    }

    async function loadDefaultPreferences() {
      try {
        // Peupler le select des modèles avec les modèles détectés
        if (modelSelect) {
          populateModelSelect(modelSelect);
        }

        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "getSettings",
              keys: [
                "claudeModel",
                "summaryLanguage",
                "summaryLength", // Ancien nom pour compatibilité
                "defaultAnalysisType", // Nouveau nom
                "customPrompts",
                "systemPrompts",
              ],
            },
            (result) => {
              if (chrome.runtime.lastError) {
                logger.error(
                  "❌ Erreur getSettings:",
                  chrome.runtime.lastError
                );
                resolve(null);
              } else {
                resolve(result);
              }
            }
          );
        });

        if (response && response.success && response.data) {
          const preferences = response.data;

          if (modelSelect && preferences.claudeModel) {
            // Sélectionner le modèle sauvegardé s'il existe
            const modelExists = Array.from(modelSelect.options).some(
              (option) => option.value === preferences.claudeModel
            );
            if (modelExists) {
              modelSelect.value = preferences.claudeModel;
            } else {
              logger.info(
                `⚠️ Modèle sauvegardé ${preferences.claudeModel} non disponible, utilisation du défaut`
              );
            }
          }
          if (languageSelect) {
            languageSelect.value = preferences.summaryLanguage || "fr";
          }

          // Charger les prompts personnalisés ET filtrer les prompts système
          await loadCustomPrompts(
            preferences.customPrompts || [],
            preferences.systemPrompts || {}
          );

          // IMPORTANT: Sélectionner le type d'analyse par défaut APRÈS avoir chargé les prompts
          if (analysisTypeSelect) {
            // Priorité: defaultAnalysisType > summaryLength (ancien nom) > "summary"
            const defaultType =
              preferences.defaultAnalysisType ||
              preferences.summaryLength ||
              "summary";

            // Vérifier que l'option existe dans le select
            const optionExists = Array.from(analysisTypeSelect.options).some(
              (option) => option.value === defaultType
            );

            if (optionExists) {
              analysisTypeSelect.value = defaultType;
              logger.info(
                `✅ Type d'analyse par défaut sélectionné: ${defaultType}`
              );
            } else {
              // Fallback vers "summary" si le type par défaut n'existe pas
              analysisTypeSelect.value = "summary";
              logger.info(
                `⚠️ Type d'analyse par défaut ${defaultType} non disponible, utilisation de "summary"`
              );
            }

            // Déclencher le changement pour mettre à jour l'interface
            handleAnalysisTypeChange();
          }
        }
      } catch (error) {
        logger.error("❌ Erreur chargement préférences:", error);
      }
    }

    async function loadCustomPrompts(customPrompts, systemPrompts) {
      if (!analysisTypeSelect || !Array.isArray(customPrompts)) return;

      // Filtrer les prompts système pour ne garder que ceux qui ne sont pas vides
      const availableSystemPrompts =
        filterAvailableSystemPrompts(systemPrompts);

      // Supprimer TOUS les options existantes (sauf custom)
      const currentOptions = Array.from(analysisTypeSelect.options);
      currentOptions.forEach((option) => {
        if (option.value !== "custom") {
          option.remove();
        }
      });

      // Trouver l'option "custom" pour insérer avant
      const customOption = analysisTypeSelect.querySelector(
        'option[value="custom"]'
      );

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

          // Insérer avant l'option "custom"
          if (customOption) {
            analysisTypeSelect.insertBefore(option, customOption);
          } else {
            analysisTypeSelect.appendChild(option);
          }
        } else {
          logger.info(
            `⚠️ Prompt système "${analysisType.value}" supprimé ou vide, non ajouté au select`
          );
        }
      });

      // Ajouter les prompts personnalisés
      customPrompts.forEach((prompt) => {
        const option = document.createElement("option");
        option.value = `custom_${prompt.id}`;
        option.textContent = `🎨 ${prompt.title}`;
        option.dataset.customPrompt = prompt.content;

        // Insérer avant l'option "custom"
        if (customOption) {
          analysisTypeSelect.insertBefore(option, customOption);
        } else {
          analysisTypeSelect.appendChild(option);
        }
      });

      const availableSystemPromptsCount = Object.keys(
        availableSystemPrompts
      ).length;
      logger.info(
        `✅ ${availableSystemPromptsCount} prompts système disponibles et ${customPrompts.length} prompts personnalisés chargés`
      );
    }

    function handleAnalysisTypeChange() {
      if (!analysisTypeSelect || !customPromptContainer) return;

      const selectedValue = analysisTypeSelect.value;

      if (selectedValue === "custom") {
        customPromptContainer.classList.add("visible");
        customPromptContainer.style.display = "block";
        if (customPrompt) {
          customPrompt.value = "";
          customPrompt.readOnly = false;
        }
      } else {
        // Pour tous les autres types (y compris les prompts personnalisés), masquer le textarea
        customPromptContainer.classList.remove("visible");
        customPromptContainer.style.display = "none";
        if (customPrompt) {
          customPrompt.value = "";
          customPrompt.readOnly = false;
        }
      }
    }

    async function performAnalysis() {
      try {
        showLoading(true);

        const selectedModel = modelSelect
          ? modelSelect.value
          : "claude-3-5-sonnet-20241022";
        const selectedLanguage = languageSelect ? languageSelect.value : "fr";
        let selectedAnalysisType = analysisTypeSelect
          ? analysisTypeSelect.value
          : "summary";
        let selectedCustomPrompt = customPrompt
          ? customPrompt.value.trim()
          : "";

        // Pour les prompts personnalisés prédéfinis, utiliser le contenu stocké
        if (selectedAnalysisType.startsWith("custom_")) {
          const selectedOption =
            analysisTypeSelect.options[analysisTypeSelect.selectedIndex];
          if (selectedOption.dataset.customPrompt) {
            selectedCustomPrompt = selectedOption.dataset.customPrompt;
            selectedAnalysisType = "custom"; // Traiter comme un prompt personnalisé
          }
        } else if (selectedAnalysisType === "custom" && !selectedCustomPrompt) {
          // Seulement pour le prompt "custom" manuel
          updateStatus(
            "❌ Veuillez entrer votre demande personnalisée",
            "error"
          );
          showLoading(false);
          return;
        }

        if (loadingText) {
          loadingText.textContent = "Analyse du contenu...";
        }

        // Obtenir l'onglet actuel
        const tabs = await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });

        if (!tabs || tabs.length === 0) {
          updateStatus("❌ Impossible d'accéder à l'onglet actuel", "error");
          showLoading(false);
          return;
        }

        const currentTab = tabs[0];

        // Stocker les données pour la conversation future
        lastAnalysisData = {
          sourceTabId: currentTab.id,
          sourceUrl: currentTab.url,
          analysisType: selectedAnalysisType,
          customPrompt: selectedCustomPrompt,
          model: selectedModel,
          language: selectedLanguage,
          timestamp: Date.now(),
          isPopupAnalysis: true,
        };

        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: "analyzeCurrentPage",
              model: selectedModel,
              language: selectedLanguage,
              length: selectedAnalysisType,
              customPrompt: selectedCustomPrompt,
            },
            (result) => {
              if (chrome.runtime.lastError) {
                logger.error(
                  "❌ Erreur message analyzeCurrentPage:",
                  chrome.runtime.lastError
                );
                resolve({
                  success: false,
                  error:
                    "Erreur de communication: " +
                    chrome.runtime.lastError.message,
                });
              } else {
                resolve(
                  result || {
                    success: false,
                    error: "Réponse vide du background script",
                  }
                );
              }
            }
          );
        });

        if (response && response.success) {
          const summary = response.data
            ? response.data.summary
            : response.summary;
          if (summary) {
            currentSummary = summary;

            // Stocker le résumé dans les données d'analyse
            lastAnalysisData.summary = summary;
            lastAnalysisData.contentInfo = response.data
              ? response.data.contentInfo
              : null;

            displayResult(currentSummary);
            updateStatus("✅ Analyse terminée!", "success");

            // Afficher les nouveaux boutons
            if (resultButtonsRow) {
              resultButtonsRow.classList.add("visible");
            }
          } else {
            updateStatus("❌ Aucun résumé reçu", "error");
          }
        } else {
          const errorMsg = response
            ? response.error
            : "Erreur de communication inconnue";
          updateStatus(`❌ ${errorMsg}`, "error");
        }
      } catch (error) {
        logger.error("❌ Erreur analyse:", error);
        updateStatus(`❌ ${error.message}`, "error");
      } finally {
        showLoading(false);
      }
    }

    async function openConversationTab() {
      if (!lastAnalysisData) {
        updateStatus("❌ Aucune analyse disponible pour continuer", "error");
        return;
      }
      try {
        logger.info("💬 Ouverture de l'onglet de conversation...");
        // Générer un ID unique pour cette conversation
        const conversationId = `conversation_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        // Récupérer le contenu original pour la conversation
        let originalContent = "";
        // Essayer de récupérer le contenu de la page
        const contentResponse = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            lastAnalysisData.sourceTabId,
            {
              action: "getPageContent",
            },
            (result) => {
              if (chrome.runtime.lastError) {
                logger.info(
                  "⚠️ Impossible de récupérer le contenu:",
                  chrome.runtime.lastError
                );
                resolve(null);
              } else {
                resolve(result);
              }
            }
          );
        });
        if (contentResponse && contentResponse.success) {
          originalContent = contentResponse.data.content;
        }
        // Préparer les données de conversation avec l'analyse existante
        const conversationData = {
          ...lastAnalysisData,
          conversationId: conversationId,
          isConversation: true,
          originalContent: originalContent,
          initialAnalysis: currentSummary,
          initialPrompt: await buildPrompt(
            lastAnalysisData.analysisType,
            lastAnalysisData.language,
            lastAnalysisData.customPrompt
          ),
        };
        logger.info("📊 Données de conversation:", conversationData);
        // Stocker les données AVANT de créer l'onglet
        chrome.storage.local.set(
          {
            [conversationId]: conversationData,
            latest_analysis: conversationId,
          },
          () => {
            if (chrome.runtime.lastError) {
              logger.error(
                "❌ Erreur stockage conversation:",
                chrome.runtime.lastError
              );
              updateStatus(
                "❌ Erreur lors de la préparation de la conversation",
                "error"
              );
              return;
            }
            logger.info(
              "✅ Données de conversation stockées avec ID:",
              conversationId
            );
            // Créer l'onglet de conversation
            chrome.tabs.create(
              {
                url: chrome.runtime.getURL("standalone-popup.html"),
                active: true,
              },
              (newTab) => {
                if (chrome.runtime.lastError) {
                  logger.error(
                    "❌ Erreur création onglet conversation:",
                    chrome.runtime.lastError
                  );
                  updateStatus(
                    "❌ Impossible d'ouvrir l'onglet de conversation",
                    "error"
                  );
                  return;
                }
                logger.info("✅ Onglet de conversation créé:", newTab.id);
                // Optionnel : fermer le popup après un délai
                setTimeout(() => {
                  window.close();
                }, 500);
              }
            );
          }
        );
      } catch (error) {
        logger.error("❌ Erreur ouverture conversation:", error);
        updateStatus(`❌ Erreur: ${error.message}`, "error");
      }
    }

    async function buildPrompt(analysisType, language, customPrompt) {
      // Récupérer les prompts système filtrés
      const systemPromptsData = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "getSettings",
            keys: ["systemPrompts"],
          },
          (response) => {
            if (response && response.success) {
              resolve(
                filterAvailableSystemPrompts(response.data.systemPrompts || {})
              );
            } else {
              resolve({});
            }
          }
        );
      });
      const languageNames = {
        fr: "français",
        en: "anglais",
        es: "espagnol",
        de: "allemand",
        it: "italien",
      };

      const defaultPrompts = {
        summary: `Fais un résumé complet et structuré de ce contenu. Utilise des titres et sous-titres en markdown.`,
        key_points: `Extrais et liste les points clés de ce contenu sous forme de liste à puces organisée.`,
        analysis: `Fais une analyse détaillée de ce contenu en expliquant les idées principales, les arguments, et les implications.`,
        questions: `Génère une série de questions importantes avec leurs réponses basées sur ce contenu.`,
        translation: `Traduis ce contenu en ${languageNames[language]} en gardant le sens et le contexte original.`,
        explanation: `Explique ce contenu de manière simple et accessible, comme si tu t'adressais à un débutant.`,
        custom:
          customPrompt || "Analyse ce contenu selon tes meilleures capacités.",
      };

      // Fusion des prompts par défaut avec les prompts personnalisés filtrés
      const analysisPrompts = { ...defaultPrompts, ...systemPromptsData };
      return `Tu es un expert en analyse de contenu. ${analysisPrompts[analysisType]}

Réponds en ${languageNames[language]} et utilise le format Markdown avec des titres (## et ###), du gras (**texte**), de l'italique (*texte*), des listes à puces (- item), et du code inline (\`code\`) si pertinent.

Contenu à analyser :`;
    }

    function displayResult(result) {
      if (!summaryText || !summaryContainer) return;

      summaryText.innerHTML = formatResultText(result);
      summaryContainer.classList.add("visible");
      summaryContainer.style.display = "block";

      // Scroll vers le résultat
      summaryContainer.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function formatResultText(text) {
      if (!text) return "";

      return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/^### (.*$)/gm, "<h3>$1</h3>")
        .replace(/^## (.*$)/gm, "<h2>$1</h2>")
        .replace(/^# (.*$)/gm, "<h1>$1</h1>")
        .replace(/^- (.*$)/gm, "<li>$1</li>")
        .replace(/(<li>.*<\/li>)/gms, "<ul>$1</ul>")
        .replace(/`(.*?)`/g, "<code>$1</code>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");
    }

    async function copyAsMarkdown() {
      if (!currentSummary) {
        updateStatus("❌ Aucun contenu à copier", "error");
        return;
      }

      try {
        await navigator.clipboard.writeText(currentSummary);
        if (copyMarkdownBtn) {
          copyMarkdownBtn.textContent = "✅ Markdown copié!";
          copyMarkdownBtn.style.backgroundColor = "#059669";

          setTimeout(() => {
            copyMarkdownBtn.textContent = "Copier en Markdown";
            copyMarkdownBtn.style.backgroundColor = "#10b981";
          }, 2000);
        }
      } catch (error) {
        logger.error("❌ Erreur copie markdown:", error);
        updateStatus("❌ Impossible de copier le markdown", "error");
      }
    }

    async function copyAsText() {
      if (!currentSummary) {
        updateStatus("❌ Aucun contenu à copier", "error");
        return;
      }

      try {
        const plainText = currentSummary
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/^#{1,3} /gm, "")
          .replace(/^- /gm, "• ")
          .replace(/`(.*?)`/g, "$1")
          .trim();

        await navigator.clipboard.writeText(plainText);
        if (copyTextBtn) {
          copyTextBtn.textContent = "✅ Texte brut copié!";
          copyTextBtn.style.backgroundColor = "#059669";

          setTimeout(() => {
            copyTextBtn.textContent = "Copier en texte brut";
            copyTextBtn.style.backgroundColor = "#10b981";
          }, 2000);
        }
      } catch (error) {
        logger.error("❌ Erreur copie texte:", error);
        updateStatus("❌ Impossible de copier le texte", "error");
      }
    }

    function openOptions() {
      chrome.runtime.openOptionsPage();
    }

    function updateStatus(message, type) {
      if (!statusDiv) return;

      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.style.display = "block";
    }

    function showLoading(show) {
      if (loadingDiv) {
        loadingDiv.style.display = show ? "block" : "none";
      }

      if (analyzeBtn) {
        analyzeBtn.disabled = show;
      }

      if (show && summaryContainer) {
        summaryContainer.classList.remove("visible");
        summaryContainer.style.display = "none";

        // Masquer les boutons pendant le chargement
        if (resultButtonsRow) {
          resultButtonsRow.classList.remove("visible");
        }
      }
    }

    // Fonction pour ouvrir en mode standalone
    function openStandalone() {
      chrome.tabs.create({
        url: chrome.runtime.getURL("standalone-popup.html"),
      });
    }
  });

  // Écouter les messages du content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updatePopupStatus") {
      const statusDiv = document.getElementById("status");
      if (statusDiv) {
        statusDiv.textContent = message.status;
        statusDiv.className = `status ${message.type}`;
        statusDiv.style.display = "block";
      }
    }
  });
})().catch(console.error);
