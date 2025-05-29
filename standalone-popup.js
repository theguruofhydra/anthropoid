/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// standalone-popup.js - Version avec conversation intégrée dans le même onglet et filtrage des prompts

(async function () {
  const logger = await getLogger();

  logger.info("🚀 Popup standalone chargé");

  document.addEventListener("DOMContentLoaded", async () => {
    logger.info("✅ DOM chargé - Initialisation popup standalone");

    // Éléments DOM
    const analyzeBtn = document.getElementById("analyzeBtn");
    const optionsBtn = document.getElementById("optionsBtn");
    const backBtn = document.getElementById("backBtn");
    const resultActions = document.getElementById("resultActions");
    const statusDiv = document.getElementById("statusDiv");
    const loadingDiv = document.getElementById("loading");
    const loadingText = document.getElementById("loadingText");
    const modelSelect = document.getElementById("modelSelect");
    const languageSelect = document.getElementById("languageSelect");
    const analysisTypeSelect = document.getElementById("analysisTypeSelect");
    const customPromptContainer = document.getElementById(
      "customPromptContainer"
    );
    const customPrompt = document.getElementById("customPrompt");
    const resultContainer = document.getElementById("resultContainer");
    const resultContent = document.getElementById("resultContent");
    const copyMarkdownBtn = document.getElementById("copyMarkdownBtn");
    const copyTextBtn = document.getElementById("copyTextBtn");
    const copyMarkdownBtnHeader = document.getElementById(
      "copyMarkdownBtnHeader"
    );
    const copyTextBtnHeader = document.getElementById("copyTextBtnHeader");
    const backBtnHeader = document.getElementById("backBtnHeader");
    const analysisInfo = document.getElementById("analysisInfo");
    const analysisTitle = document.getElementById("analysisTitle");
    const analysisDescription = document.getElementById("analysisDescription");
    const sourceContentDiv = document.getElementById("sourceContentDiv");
    const sourceContent = document.getElementById("sourceContent");

    // Éléments de conversation intégrée
    const conversationContainer = document.getElementById(
      "conversationContainer"
    );
    const conversationHistory = document.getElementById("conversationHistory");
    const continuePrompt = document.getElementById("continuePrompt");
    const continueBtn = document.getElementById("continueBtn");
    const clearConversationBtn = document.getElementById(
      "clearConversationBtn"
    );

    // Variables globales
    let analysisData = null;
    let currentSummary = "";
    let sourceTabId = null;
    let originalContent = "";
    let conversationMessages = []; // Historique pour Claude

    // Initialisation du gestionnaire de version
    await initVersionManager();

    // Initialisation du thème
    await initThemeManager();

    // Initialisation du gestionnaire de modèles
    await initModelManager();

    // Initialisation
    await initializeStandalonePopup();

    // Event listeners
    analyzeBtn.addEventListener("click", performAnalysis);
    optionsBtn.addEventListener("click", openOptions);
    backBtn.addEventListener("click", goBackToSource);
    copyMarkdownBtn.addEventListener("click", copyAsMarkdown);
    copyTextBtn.addEventListener("click", copyAsText);

    // Event listeners pour les boutons du header
    if (copyMarkdownBtnHeader) {
      copyMarkdownBtnHeader.addEventListener("click", copyAsMarkdownHeader);
    }
    if (copyTextBtnHeader) {
      copyTextBtnHeader.addEventListener("click", copyAsTextHeader);
    }
    if (backBtnHeader) {
      backBtnHeader.addEventListener("click", goBackToSource);
    }
    analysisTypeSelect.addEventListener("change", handleAnalysisTypeChange);

    // Event listeners pour la conversation
    if (continueBtn) {
      continueBtn.addEventListener("click", continueConversation);
    }
    if (clearConversationBtn) {
      clearConversationBtn.addEventListener("click", clearConversation);
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

    async function initializeStandalonePopup() {
      try {
        logger.info("🔧 Initialisation du popup standalone...");

        // Masquer les boutons du bas par défaut
        if (resultActions) {
          resultActions.style.display = "none";
          logger.info("✅ Boutons du bas cachés par défaut");
        }

        // D'abord chercher les données de conversation stockées par le popup classique
        logger.info("🔍 Recherche des données de conversation...");

        const latestResult = await new Promise((resolve) => {
          chrome.storage.local.get(["latest_analysis"], (result) => {
            if (chrome.runtime.lastError) {
              logger.error(
                "❌ Erreur latest_analysis:",
                chrome.runtime.lastError
              );
              resolve(null);
            } else {
              resolve(result);
            }
          });
        });

        if (latestResult && latestResult.latest_analysis) {
          logger.info(
            "🎯 ID de la dernière analyse:",
            latestResult.latest_analysis
          );

          const latestData = await new Promise((resolve) => {
            chrome.storage.local.get(
              [latestResult.latest_analysis],
              (result) => {
                if (chrome.runtime.lastError) {
                  logger.error(
                    "❌ Erreur récupération dernière analyse:",
                    chrome.runtime.lastError
                  );
                  resolve(null);
                } else {
                  resolve(result);
                }
              }
            );
          });

          if (latestData && latestData[latestResult.latest_analysis]) {
            analysisData = latestData[latestResult.latest_analysis];
            logger.info("✅ Données de conversation récupérées:", analysisData);

            // Nettoyer le storage
            chrome.storage.local.remove([
              latestResult.latest_analysis,
              "latest_analysis",
            ]);
          }
        }

        // Fallback: chercher par tab ID si pas trouvé
        if (!analysisData) {
          let currentTabId = await getCurrentTabId();
          logger.info("📋 Tab ID actuel:", currentTabId);

          if (currentTabId) {
            const storageKey = `analysis_${currentTabId}`;
            const result = await new Promise((resolve) => {
              chrome.storage.local.get([storageKey], (result) => {
                if (chrome.runtime.lastError) {
                  logger.error(
                    "❌ Erreur storage avec tab ID:",
                    chrome.runtime.lastError
                  );
                  resolve({});
                } else {
                  resolve(result || {});
                }
              });
            });

            if (result && result[storageKey]) {
              analysisData = result[storageKey];
              chrome.storage.local.remove([storageKey]);
            }
          }
        }

        // Dernier fallback: chercher par timestamp
        if (!analysisData) {
          logger.info("🔍 Recherche par timestamp...");

          const allStorageData = await new Promise((resolve) => {
            chrome.storage.local.get(null, (result) => {
              if (chrome.runtime.lastError) {
                logger.error(
                  "❌ Erreur storage.local.get:",
                  chrome.runtime.lastError
                );
                resolve({});
              } else {
                resolve(result || {});
              }
            });
          });

          logger.info("📦 Toutes les données storage:", allStorageData);

          const analysisKeys = Object.keys(allStorageData).filter(
            (key) =>
              key.startsWith("analysis_") || key.startsWith("conversation_")
          );
          logger.info("🔑 Clés d'analyse trouvées:", analysisKeys);

          if (analysisKeys.length > 0) {
            let mostRecentKey = analysisKeys[0];
            let mostRecentTimestamp = 0;

            for (const key of analysisKeys) {
              const data = allStorageData[key];
              if (data && data.timestamp > mostRecentTimestamp) {
                mostRecentTimestamp = data.timestamp;
                mostRecentKey = key;
              }
            }

            logger.info(
              "🎯 Utilisation de la clé la plus récente:",
              mostRecentKey
            );
            analysisData = allStorageData[mostRecentKey];

            for (const key of analysisKeys) {
              chrome.storage.local.remove([key]);
            }
          }
        }

        if (analysisData) {
          sourceTabId = analysisData.sourceTabId;
          logger.info("📊 Données d'analyse récupérées:", analysisData);

          await setupAnalysisInterface();

          // Si on a déjà un résumé (mode conversation), l'afficher directement
          if (analysisData.summary || analysisData.initialAnalysis) {
            currentSummary =
              analysisData.summary || analysisData.initialAnalysis;

            // Afficher le résultat existant
            displayResult(currentSummary);
            showConversationInterface();
            hideStatus();

            // Ancrer automatiquement au résultat après un court délai
            setTimeout(() => {
              resultContainer.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest",
              });
            }, 500); // Délai plus long pour l'initialisation

            logger.info("📄 Résumé existant affiché et ancré");
          }

          const hasValidConfig = await checkApiConfiguration();
          if (!hasValidConfig) {
            return;
          }

          analyzeBtn.disabled = false;
          // Auto-analyser si demandé (menu contextuel)
          if (analysisData.autoAnalyze) {
            logger.info("🚀 Lancement automatique de l'analyse...");
            setTimeout(() => {
              performAnalysis();
            }, 500);
          }
        } else {
          throw new Error(
            "Aucune donnée d'analyse trouvée. Veuillez utiliser le menu contextuel."
          );
        }
      } catch (error) {
        logger.error("❌ Erreur initialisation:", error);
        showStatus(error.message + " - Cliquez pour debug", "error");

        statusDiv.style.cursor = "pointer";
        statusDiv.onclick = async () => {
          logger.info("🔍 === DEBUG MANUEL ===");
          const debugResponse = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { action: "debugAnalysisData" },
              resolve
            );
          });
          logger.info("📊 Réponse debug:", debugResponse);
        };

        analyzeBtn.disabled = true;
      }
    }

    async function getCurrentTabId() {
      return new Promise((resolve) => {
        if (chrome.tabs && chrome.tabs.getCurrent) {
          chrome.tabs.getCurrent((tab) => {
            if (chrome.runtime.lastError) {
              resolve(null);
            } else {
              resolve(tab ? tab.id : null);
            }
          });
        } else {
          resolve(null);
        }
      });
    }

    async function setupAnalysisInterface() {
      const preferences = await loadDefaultPreferences();

      // Valeurs par défaut d'abord
      if (languageSelect) {
        languageSelect.value = "fr";
      }

      // Déterminer le type d'analyse à utiliser par priorité
      let targetAnalysisType = "summary"; // Fallback final

      // 1. Priorité ABSOLUE : analysisData spécifique à cette analyse (menu contextuel)
      if (analysisData.analysisType && analysisData.analysisType !== "custom") {
        targetAnalysisType = analysisData.analysisType;
        logger.info(
          `🎯 Type d'analyse depuis analysisData: ${targetAnalysisType}`
        );
      }
      // 2. Sinon : préférences utilisateur par défaut (configuré dans les options)
      else if (preferences && preferences.defaultAnalysisType) {
        targetAnalysisType = preferences.defaultAnalysisType;
        logger.info(
          `⚙️ Type d'analyse depuis préférences: ${targetAnalysisType}`
        );
      }
      // 3. Fallback pour compatibilité ancien nom
      else if (preferences && preferences.summaryLength) {
        targetAnalysisType = preferences.summaryLength;
        logger.info(
          `⚙️ Type d'analyse depuis summaryLength (ancien): ${targetAnalysisType}`
        );
      }

      // Appliquer le type d'analyse déterminé
      if (analysisTypeSelect) {
        // Vérifier que l'option existe dans le select
        const optionExists = Array.from(analysisTypeSelect.options).some(
          (option) => option.value === targetAnalysisType
        );

        if (optionExists) {
          analysisTypeSelect.value = targetAnalysisType;
          logger.info(`✅ Type d'analyse sélectionné: ${targetAnalysisType}`);
        } else {
          // Fallback vers "summary" si le type par défaut n'existe pas
          analysisTypeSelect.value = "summary";
          logger.info(
            `⚠️ Type d'analyse ${targetAnalysisType} non disponible, utilisation de "summary"`
          );
        }
      }

      if (analysisData.analysisType && analysisData.analysisType !== "custom") {
        // Cette section est maintenant gérée par la logique ci-dessus
      } else if (analysisData.customPrompt) {
        // Vérifier si c'est un prompt personnalisé existant
        const customPromptOption = Array.from(analysisTypeSelect.options).find(
          (option) => option.dataset.customPrompt === analysisData.customPrompt
        );

        if (customPromptOption) {
          // C'est un prompt personnalisé existant, sélectionner directement
          analysisTypeSelect.value = customPromptOption.value;
          customPromptContainer.classList.remove("visible");
          customPromptContainer.style.display = "none";
        } else {
          // C'est un prompt vraiment personnalisé, afficher le textarea
          analysisTypeSelect.value = "custom";
          customPrompt.value = analysisData.customPrompt;
          customPromptContainer.classList.add("visible");
          customPromptContainer.style.display = "block";
        }
      }

      let title = "";
      let description = "";

      if (analysisData.isSelection) {
        title = "📝 Analyse de sélection de texte";
        description = `Texte sélectionné depuis : ${
          new URL(analysisData.sourceUrl).hostname
        }`;
        originalContent = analysisData.selectedText;

        if (analysisData.selectedText) {
          sourceContent.textContent =
            analysisData.selectedText.substring(0, 500) +
            (analysisData.selectedText.length > 500 ? "..." : "");
          sourceContentDiv.style.display = "block";
        }
      } else {
        title = "🌐 Analyse de page complète";
        description = `Page source : ${analysisData.sourceUrl}`;
      }

      analysisTitle.textContent = title;
      analysisDescription.textContent = description;
      analysisInfo.style.display = "block";

      // Pré-remplir avec les données de l'analyse précédente
      if (analysisData.model && modelSelect) {
        modelSelect.value = analysisData.model;
      }
      if (analysisData.language && languageSelect) {
        languageSelect.value = analysisData.language;
      }

      // Déclencher le changement pour mettre à jour l'interface
      handleAnalysisTypeChange();
    }

    async function checkApiConfiguration() {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "checkApiKey" }, resolve);
        });

        if (
          !response ||
          !response.success ||
          !response.hasApiKey ||
          !response.isValid
        ) {
          showStatus(
            "⚠️ Clé API Claude non configurée. Allez dans les options de l'extension.",
            "warning"
          );
          return false;
        }

        return true;
      } catch (error) {
        logger.error("❌ Erreur vérification API:", error);
        showStatus("⚠️ Erreur de vérification API", "error");
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
                "defaultAnalysisType", // Nouveau nom prioritaire
                "summaryLength", // Ancien nom pour compatibilité
                "customPrompts",
                "systemPrompts",
              ],
            },
            resolve
          );
        });

        if (response && response.success) {
          const preferences = response.data || {};

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

      // Retourner les préférences pour utilisation dans setupAnalysisInterface
      return preferences;
    }

    async function performAnalysis() {
      if (analyzeBtn.disabled) {
        showStatus("❌ Analyse non disponible", "error");
        return;
      }

      // Vérifier si on a déjà un résultat (mode conversation)
      const hasExistingResult =
        resultContainer && resultContainer.classList.contains("visible");

      try {
        if (!hasExistingResult) {
          showLoading(true);
        } else {
          // Mode conversation : juste désactiver le bouton
          analyzeBtn.disabled = true;
          analyzeBtn.textContent = "🔄 Analyse...";
        }

        const selectedModel = modelSelect.value;
        const selectedLanguage = languageSelect.value;
        let selectedAnalysisType = analysisTypeSelect.value;
        let selectedCustomPrompt = customPrompt.value.trim();

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
          showStatus("❌ Veuillez entrer votre demande personnalisée", "error");
          showLoading(false);
          return;
        }
        let response;

        if (analysisData.isSelection) {
          loadingText.textContent = "📝 Analyse de la sélection...";
          response = await analyzeTextDirectly(
            analysisData.selectedText,
            selectedModel,
            selectedLanguage,
            selectedAnalysisType,
            selectedCustomPrompt
          );
        } else {
          loadingText.textContent = "Analyse du contenu...";

          // Récupérer le contenu original pour les conversations futures
          const contentResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(
              sourceTabId,
              { action: "getPageContent" },
              resolve
            );
          });

          if (contentResponse && contentResponse.success) {
            originalContent = contentResponse.data.content;
          }

          response = await new Promise((resolve) => {
            chrome.tabs.sendMessage(
              sourceTabId,
              {
                action: "analyzePage",
                model: selectedModel,
                language: selectedLanguage,
                length: selectedAnalysisType,
                customPrompt: selectedCustomPrompt,
              },
              resolve
            );
          });
        }

        if (response && response.success) {
          currentSummary = response.data
            ? response.data.summary
            : response.summary;

          // Initialiser l'historique de conversation
          const initialPrompt = await buildPrompt(
            selectedAnalysisType,
            selectedLanguage,
            selectedCustomPrompt
          );
          conversationMessages = [
            {
              role: "user",
              content: `${initialPrompt}\n\n${
                originalContent || analysisData.selectedText
              }`,
            },
            {
              role: "assistant",
              content: currentSummary,
            },
          ];

          displayResult(currentSummary);
          showConversationInterface();
          hideStatus();

          // Ancrer au résultat après l'analyse avec un délai pour l'animation
          setTimeout(() => {
            resultContainer.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
          }, 300);
        } else {
          const errorMsg = response
            ? response.error || "Erreur inconnue"
            : "Erreur de communication";
          showStatus(`❌ ${errorMsg}`, "error");
        }
      } catch (error) {
        logger.error("❌ Erreur analyse:", error);
        showStatus(`❌ ${error.message}`, "error");
      } finally {
        if (!hasExistingResult) {
          showLoading(false);
        } else {
          // Mode conversation : restaurer juste le bouton
          analyzeBtn.disabled = false;
          analyzeBtn.innerHTML =
            '<span data-i18n="analyzeBtnText">🚀 Analyser</span>';
        }
      }
    }

    function showConversationInterface() {
      // S'assurer que le résultat principal reste visible
      if (resultContainer) {
        resultContainer.style.display = "block";
      }
      if (resultActions) {
        resultActions.style.display = "grid";
      }

      // Afficher l'interface de conversation SOUS le résultat
      conversationContainer.style.display = "block";

      // Interface de démarrage de conversation
      conversationHistory.innerHTML = `
      <div class="conversation-placeholder">
      </div>
    `;

      // Focus sur le champ de saisie
      if (continuePrompt) {
        continuePrompt.focus();

        // Gestion des raccourcis clavier pour la conversation (ne pas répéter l'event listener)
        if (!continuePrompt.hasAttribute("data-keyboard-setup")) {
          continuePrompt.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              if (e.altKey) {
                // Alt+Entrée : saut de ligne (comportement par défaut du textarea)
                return;
              } else {
                // Entrée seule : envoyer le message
                e.preventDefault();
                continueBtn.click();
              }
            }
          });
          continuePrompt.setAttribute("data-keyboard-setup", "true");
        }
      }
    }

    async function continueConversation() {
      const followUpPrompt = continuePrompt.value.trim();
      if (!followUpPrompt) {
        showStatus("❌ Veuillez entrer votre question ou demande", "error");
        return;
      }

      // Initialiser le contexte si c'est la première question
      if (conversationMessages.length === 0) {
        const initialPrompt = buildPrompt(
          analysisData.analysisType || "summary",
          analysisData.language || "fr",
          analysisData.customPrompt || ""
        );

        conversationMessages = [
          {
            role: "user",
            content: `${initialPrompt}\n\n${
              originalContent || analysisData.selectedText || ""
            }`,
          },
          {
            role: "assistant",
            content: currentSummary,
          },
        ];
        logger.info("🔄 Contexte de conversation initialisé");
      }

      try {
        // Affichage d'un indicateur de chargement spécifique pour la conversation
        if (continueBtn) {
          continueBtn.disabled = true;
          continueBtn.textContent = "🤔 Réflexion...";
        }

        // Ajouter la nouvelle question à la conversation
        conversationMessages.push({
          role: "user",
          content: followUpPrompt,
        });

        // Afficher la question immédiatement
        addToConversationHistory(followUpPrompt, "user");

        // Appeler Claude avec l'historique complet
        const response = await callClaudeWithConversation(
          conversationMessages,
          modelSelect.value
        );

        if (response) {
          // Ajouter la réponse à l'historique
          conversationMessages.push({
            role: "assistant",
            content: response,
          });

          // Afficher la nouvelle réponse
          addToConversationHistory(response, "assistant");
          // NE PAS changer currentSummary pour garder l'analyse originale pour la copie
          // currentSummary reste l'analyse initiale

          // Vider le champ de prompt
          continuePrompt.value = "";
          hideStatus();
        } else {
          showStatus("❌ Erreur lors de la génération de la réponse", "error");
          // Retirer la question en cas d'erreur
          conversationMessages.pop();
        }
      } catch (error) {
        logger.error("❌ Erreur continuation conversation:", error);
        showStatus(`❌ ${error.message}`, "error");
        // Retirer la question en cas d'erreur
        conversationMessages.pop();
      } finally {
        // Restaurer le bouton de conversation
        if (continueBtn) {
          continueBtn.disabled = false;
          continueBtn.innerHTML =
            '<span data-i18n="sendMessage">📤 Envoyer</span>';
        }
      }
    }

    async function callClaudeWithConversation(messages, model) {
      const settings = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "getSettings",
            keys: ["claudeApiKey"],
          },
          resolve
        );
      });

      if (!settings || !settings.success || !settings.data.claudeApiKey) {
        throw new Error("Clé API Claude non configurée");
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.data.claudeApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4000,
          temperature: 0.3,
          messages: messages,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur Claude API: ${error}`);
      }

      const data = await response.json();
      return data.content[0].text;
    }

    function addToConversationHistory(message, sender) {
      // Supprimer le placeholder s'il existe
      const placeholder = conversationHistory.querySelector(
        ".conversation-placeholder"
      );
      if (placeholder) {
        placeholder.remove();
      }

      const messageElement = document.createElement("div");
      messageElement.className = "conversation-item";

      if (sender === "user") {
        messageElement.innerHTML = `
        <div class="conversation-question">
          <div class="label">🗨️ Vous</div>
          <div class="content">${escapeHtml(message)}</div>
        </div>
      `;
      } else {
        messageElement.innerHTML = `
        <div class="conversation-answer">
          <div class="label"><img src='icons/icon-32.png' width='16' height='16' alt='Anthropoïd'> Claude</div>
          <div class="content">${formatText(message)}</div>
        </div>
      `;
      }

      conversationHistory.appendChild(messageElement);

      // Scroll vers le nouveau message SEULEMENT pour les réponses de Claude
      if (sender === "assistant") {
        setTimeout(() => {
          messageElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }, 100);
      }
    }

    function clearConversation() {
      if (
        confirm(
          "⚠️ Effacer toute la conversation ? Cette action est irréversible."
        )
      ) {
        // Garder seulement l'analyse initiale dans le contexte
        if (conversationMessages.length >= 2) {
          conversationMessages = [
            conversationMessages[0],
            conversationMessages[1],
          ];
        }

        // Remettre l'interface de démarrage SANS affecter le résultat principal
        conversationHistory.innerHTML = `
        <div class="conversation-placeholder">
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #3b82f6;">
            <h4 style="margin: 0 0 8px 0; color: #1e40af;">💬 Continuez la conversation</h4>
            <p style="margin: 0; color: #6b7280; font-size: 14px;">
              Posez des questions ou demandez des précisions sur l'analyse ci-dessus.
            </p>
          </div>
        </div>
      `;

        continuePrompt.value = "";
        logger.info("🗑️ Conversation effacée");
      }
    }

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    async function analyzeTextDirectly(
      text,
      model,
      language,
      analysisType,
      customPrompt
    ) {
      const prompt = await buildPrompt(analysisType, language, customPrompt);

      const settings = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: "getSettings",
            keys: ["claudeApiKey"],
          },
          resolve
        );
      });

      if (!settings || !settings.success || !settings.data.claudeApiKey) {
        throw new Error("Clé API Claude non configurée");
      }

      const maxContentLength = 25000;
      const limitedText =
        text.length > maxContentLength
          ? text.substring(0, maxContentLength) +
            "\n\n[Contenu tronqué pour respecter les limites]"
          : text;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.data.claudeApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 4000,
          temperature: 0.3,
          messages: [
            {
              role: "user",
              content: prompt + "\n\n" + limitedText,
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Erreur Claude API: ${error}`);
      }

      const data = await response.json();
      return {
        success: true,
        summary: data.content[0].text,
      };
    }

    async function buildPrompt(analysisType, language, customPrompt) {
      const languageNames = {
        fr: "français",
        en: "anglais",
        es: "espagnol",
        de: "allemand",
        it: "italien",
      };

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

    function handleAnalysisTypeChange() {
      const selectedValue = analysisTypeSelect.value;

      if (selectedValue === "custom") {
        // Seulement pour le prompt "custom" manuel, pas pour les prompts personnalisés prédéfinis
        customPromptContainer.classList.add("visible");
        customPromptContainer.style.display = "block";
        if (customPrompt) {
          customPrompt.value = "";
          customPrompt.readOnly = false;
        }
      } else {
        // Pour tous les autres types (y compris les prompts personnalisés prédéfinis), masquer le textarea
        customPromptContainer.classList.remove("visible");
        customPromptContainer.style.display = "none";
        if (customPrompt) {
          customPrompt.value = "";
          customPrompt.readOnly = false;
        }
      }
    }

    function displayResult(result) {
      // Ne pas re-créer si le résultat existe déjà
      if (!resultContainer.classList.contains("visible")) {
        resultContent.innerHTML = formatText(result);
        resultContainer.classList.add("visible");
        resultContainer.style.display = "block";

        // Afficher les actions en bas de page
        if (resultActions) {
          resultActions.style.display = "grid";
        }

        // Ancrer au début du résultat avec un délai pour permettre le rendu
        setTimeout(() => {
          resultContainer.scrollIntoView({
            behavior: "smooth",
            block: "start",
            inline: "nearest",
          });
        }, 100);
      } else {
        // Si le résultat existe déjà, juste mettre à jour le contenu si nécessaire
        if (resultContent.innerHTML !== formatText(result)) {
          resultContent.innerHTML = formatText(result);
        }
      }
    }

    function formatText(text) {
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
      try {
        await navigator.clipboard.writeText(currentSummary);
        if (copyMarkdownBtn) {
          copyMarkdownBtn.textContent = "✅ Copié!";
          copyMarkdownBtn.style.backgroundColor = "#059669";

          setTimeout(() => {
            copyMarkdownBtn.textContent = "📝 Copier Markdown";
            copyMarkdownBtn.style.backgroundColor = "";
          }, 2000);
        }
      } catch (error) {
        logger.error("❌ Erreur copie markdown:", error);
        showStatus("❌ Impossible de copier le markdown", "error");
      }
    }

    async function copyAsMarkdownHeader() {
      try {
        await navigator.clipboard.writeText(currentSummary);
        if (copyMarkdownBtnHeader) {
          copyMarkdownBtnHeader.textContent = "✅ Copié!";
          copyMarkdownBtnHeader.style.backgroundColor = "#059669";

          setTimeout(() => {
            copyMarkdownBtnHeader.textContent = "Copier en Markdown";
            copyMarkdownBtnHeader.style.backgroundColor = "";
          }, 2000);
        }
      } catch (error) {
        logger.error("❌ Erreur copie markdown:", error);
        showStatus("❌ Impossible de copier le markdown", "error");
      }
    }

    async function copyAsText() {
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
          copyTextBtn.textContent = "✅ Copié!";
          copyTextBtn.style.backgroundColor = "#059669";

          setTimeout(() => {
            copyTextBtn.textContent = "📄 Copier Texte";
            copyTextBtn.style.backgroundColor = "";
          }, 2000);
        }
      } catch (error) {
        logger.error("❌ Erreur copie texte:", error);
        showStatus("❌ Impossible de copier le texte", "error");
      }
    }

    async function copyAsTextHeader() {
      try {
        const plainText = currentSummary
          .replace(/\*\*(.*?)\*\*/g, "$1")
          .replace(/\*(.*?)\*/g, "$1")
          .replace(/^#{1,3} /gm, "")
          .replace(/^- /gm, "• ")
          .replace(/`(.*?)`/g, "$1")
          .trim();

        await navigator.clipboard.writeText(plainText);
        if (copyTextBtnHeader) {
          copyTextBtnHeader.textContent = "✅ Copié!";
          copyTextBtnHeader.style.backgroundColor = "#059669";

          setTimeout(() => {
            copyTextBtnHeader.textContent = "Copier en texte brut";
            copyTextBtnHeader.style.backgroundColor = "";
          }, 2000);
        }
      } catch (error) {
        logger.error("❌ Erreur copie texte:", error);
        showStatus("❌ Impossible de copier le texte", "error");
      }
    }

    function goBackToSource() {
      if (sourceTabId) {
        chrome.tabs.update(sourceTabId, { active: true }, (updatedTab) => {
          if (chrome.runtime.lastError) {
            logger.info(
              "⚠️ Impossible d'activer l'onglet source:",
              chrome.runtime.lastError
            );
            window.close();
          } else {
            window.close();
          }
        });
      } else {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      }
    }

    function openOptions() {
      chrome.runtime.openOptionsPage();
    }

    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.style.display = "block";
    }

    function hideStatus() {
      statusDiv.style.display = "none";
    }

    function showLoading(show) {
      loadingDiv.style.display = show ? "block" : "none";
      if (analyzeBtn) analyzeBtn.disabled = show;
      if (optionsBtn) optionsBtn.disabled = show;
      if (continueBtn) continueBtn.disabled = show;

      if (show) {
        // NE PAS effacer le résultat s'il existe déjà (mode conversation)
        if (resultContainer && !resultContainer.classList.contains("visible")) {
          resultContainer.classList.remove("visible");
          resultContainer.style.display = "none";
        }
        hideStatus();
        // Masquer les boutons d'action seulement si pas de résultat existant
        if (resultActions && !resultContainer.classList.contains("visible")) {
          resultActions.style.display = "none";
        }
      }
    }
  });

  // Gestion des raccourcis clavier
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      window.close();
    }

    if (e.ctrlKey && e.key === "Enter") {
      // Ctrl+Entrée reste pour le bouton d'analyse principal
      const analyzeBtn = document.getElementById("analyzeBtn");
      if (analyzeBtn && !analyzeBtn.disabled) {
        analyzeBtn.click();
      }
    }
  });
})().catch(console.error);
