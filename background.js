/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// background.js - Version avec filtrage des prompts supprimés

(async function () {
  const logger = await getLogger();

  logger.info("🎬 Anthropoïd - Background script démarré");

  let selectedText = "";

  // Installation de l'extension
  chrome.runtime.onInstalled.addListener((details) => {
    logger.info("📦 Extension installée:", details.reason);
    createContextMenus();

    if (details.reason === "install") {
      chrome.runtime.openOptionsPage();
    }
  });

  // Écouter les changements de storage pour recréer les menus contextuels
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (
      (changes.customPrompts || changes.systemPrompts) &&
      (namespace === "sync" || namespace === "local")
    ) {
      logger.info(
        "🔄 Mise à jour des menus contextuels suite à changement de prompts"
      );
      createContextMenus();
    }
  });

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

  // Créer les menus contextuels
  async function createContextMenus() {
    chrome.contextMenus.removeAll(async () => {
      // Menu principal
      chrome.contextMenus.create({
        id: "Anthropoïd-open-analysis",
        title: "Analyser avec Anthropoïd",
        contexts: ["selection", "page"],
        icons: {
          16: "icons/icon-16.png",
          32: "icons/icon-32.png",
        },
      });

      // Sous-menu pour analyses rapides
      chrome.contextMenus.create({
        id: "Anthropoïd-submenu",
        title: "🎯 Analyses rapides",
        contexts: ["selection", "page"],
      });

      // Charger les prompts système et personnalisés
      const settings = await new Promise((resolve) => {
        chrome.storage.sync.get(
          ["systemPrompts", "customPrompts"],
          (result) => {
            if (chrome.runtime.lastError) {
              chrome.storage.local.get(
                ["systemPrompts", "customPrompts"],
                (localResult) => {
                  resolve(localResult || {});
                }
              );
            } else {
              resolve(result || {});
            }
          }
        );
      });

      // Filtrer les prompts système pour ne garder que ceux qui ne sont pas vides
      const availableSystemPrompts = filterAvailableSystemPrompts(
        settings.systemPrompts
      );

      // Mapping des types d'analyse avec leurs infos d'affichage
      const analysisTypesInfo = {
        summary: { title: "📝 Résumé complet", id: "Anthropoïd-summary" },
        key_points: { title: "🎯 Points clés", id: "Anthropoïd-key_points" },
        analysis: { title: "🔍 Analyse détaillée", id: "Anthropoïd-analysis" },
        questions: {
          title: "❓ Questions/Réponses",
          id: "Anthropoïd-questions",
        },
        translation: {
          title: "🌍 Traduire en français",
          id: "Anthropoïd-translation",
        },
        explanation: {
          title: "💡 Explication simple",
          id: "Anthropoïd-explanation",
        },
      };

      // Ajouter seulement les prompts système disponibles (non supprimés)
      Object.keys(analysisTypesInfo).forEach((analysisType) => {
        // Vérifier si le prompt système existe et n'est pas vide
        if (availableSystemPrompts[analysisType]) {
          const info = analysisTypesInfo[analysisType];
          chrome.contextMenus.create({
            id: info.id,
            parentId: "Anthropoïd-submenu",
            title: info.title,
            contexts: ["selection", "page"],
          });
        } else {
          logger.info(
            `⚠️ Prompt système "${analysisType}" supprimé ou vide, non ajouté au menu`
          );
        }
      });

      // Ajouter les prompts personnalisés s'ils existent
      const customPrompts = settings.customPrompts || [];
      if (customPrompts.length > 0) {
        // Vérifier s'il y a des prompts système disponibles pour ajouter un séparateur
        const hasSystemPrompts = Object.keys(availableSystemPrompts).length > 0;

        if (hasSystemPrompts) {
          // Séparateur seulement s'il y a des prompts système avant
          chrome.contextMenus.create({
            id: "Anthropoïd-separator",
            parentId: "Anthropoïd-submenu",
            type: "separator",
            contexts: ["selection", "page"],
          });
        }

        // Ajouter chaque prompt personnalisé
        customPrompts.forEach((prompt) => {
          chrome.contextMenus.create({
            id: `Anthropoïd-custom-${prompt.id}`,
            parentId: "Anthropoïd-submenu",
            title: `🎨 ${prompt.title}`,
            contexts: ["selection", "page"],
          });
        });
      }

      const systemPromptsCount = Object.keys(availableSystemPrompts).length;
      logger.info(
        `📋 Menus contextuels créés avec ${systemPromptsCount} prompts système disponibles et ${customPrompts.length} prompts personnalisés`
      );
    });
  }

  // Gestion des clics sur les menus contextuels
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    logger.info("📋 Menu contextuel cliqué:", info.menuItemId);

    if (info.menuItemId === "Anthropoïd-open-analysis") {
      createAnalysisTab(info, tab, "custom", "", false);
      return;
    }

    // Gestion des prompts par défaut
    const defaultAnalysisTypes = {
      "Anthropoïd-summary": "summary",
      "Anthropoïd-key_points": "key_points",
      "Anthropoïd-analysis": "analysis",
      "Anthropoïd-questions": "questions",
      "Anthropoïd-translation": "translation",
      "Anthropoïd-explanation": "explanation",
    };

    if (defaultAnalysisTypes[info.menuItemId]) {
      createAnalysisTab(
        info,
        tab,
        defaultAnalysisTypes[info.menuItemId],
        "",
        true
      );
      return;
    }

    // Gestion des prompts personnalisés
    if (info.menuItemId.startsWith("Anthropoïd-custom-")) {
      const promptId = info.menuItemId.replace("Anthropoïd-custom-", "");

      // Récupérer le prompt personnalisé
      const settings = await new Promise((resolve) => {
        chrome.storage.sync.get(["customPrompts"], (result) => {
          if (chrome.runtime.lastError) {
            chrome.storage.local.get(["customPrompts"], (localResult) => {
              resolve(localResult || {});
            });
          } else {
            resolve(result || {});
          }
        });
      });

      const customPrompts = settings.customPrompts || [];
      const customPrompt = customPrompts.find((p) => p.id === promptId);

      if (customPrompt) {
        logger.info("🎨 Prompt personnalisé trouvé:", customPrompt.title);
        createAnalysisTab(info, tab, "custom", customPrompt.content, true);
      } else {
        logger.error("❌ Prompt personnalisé non trouvé:", promptId);
      }
    }
  });

  function createAnalysisTab(
    info,
    tab,
    analysisType,
    customPrompt,
    autoAnalyze
  ) {
    logger.info("🚀 Création onglet analyse...");

    const analysisData = {
      sourceTabId: tab.id,
      sourceUrl: tab.url,
      analysisType: analysisType,
      customPrompt: customPrompt,
      selectedText: info.selectionText || "",
      isSelection: !!info.selectionText,
      timestamp: Date.now(),
      autoAnalyze: autoAnalyze,
    };

    const analysisId = `analysis_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    chrome.storage.local.set(
      {
        [analysisId]: analysisData,
        latest_analysis: analysisId,
      },
      () => {
        if (chrome.runtime.lastError) {
          logger.error("❌ Erreur stockage:", chrome.runtime.lastError);
          return;
        }

        chrome.tabs.create({
          url: chrome.runtime.getURL("standalone-popup.html"),
          active: true,
        });
      }
    );
  }

  // Gestion des messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    logger.info("📨 Message reçu dans background:", message);

    switch (message.action) {
      case "updateSelection":
        selectedText = message.text;
        sendResponse({ success: true });
        return true;

      case "checkApiKey":
        handleCheckApiKey(sendResponse);
        return true;

      case "analyzeCurrentPage":
        handleAnalyzeCurrentPage(message, sendResponse);
        return true;

      case "getSettings":
        handleGetSettings(message, sendResponse);
        return true;

      case "generateSummary":
        logger.info("🔄 Traitement generateSummary...");
        handleGenerateSummary(message.data, sendResponse);
        return true;

      default:
        logger.info("💬 Message non géré:", message.action);
        sendResponse({ success: false, error: "Action non reconnue" });
        return true;
    }
  });

  function handleCheckApiKey(sendResponse) {
    try {
      chrome.storage.sync.get(["claudeApiKey"], (result) => {
        if (chrome.runtime.lastError) {
          chrome.storage.local.get(["claudeApiKey"], (localResult) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: "Impossible d'accéder au storage",
              });
            } else {
              sendResponse({
                success: true,
                hasApiKey: !!(localResult && localResult.claudeApiKey),
                isValid:
                  (localResult &&
                    localResult.claudeApiKey &&
                    localResult.claudeApiKey.startsWith("sk-ant-api")) ||
                  false,
              });
            }
          });
        } else {
          sendResponse({
            success: true,
            hasApiKey: !!(result && result.claudeApiKey),
            isValid:
              (result &&
                result.claudeApiKey &&
                result.claudeApiKey.startsWith("sk-ant-api")) ||
              false,
          });
        }
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }

  function handleAnalyzeCurrentPage(message, sendResponse) {
    logger.info("🔄 Analyse page courante...");

    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError || !tabs || tabs.length === 0) {
          sendResponse({
            success: false,
            error: "Impossible d'accéder aux onglets",
          });
          return;
        }

        const currentTab = tabs[0];
        logger.info("📋 Onglet trouvé:", currentTab.id, currentTab.url);

        // Test de connectivité avec le content script
        logger.info("🔍 Test de connectivité avec le content script...");

        chrome.tabs.sendMessage(
          currentTab.id,
          { action: "ping" },
          (pingResponse) => {
            if (chrome.runtime.lastError || !pingResponse) {
              logger.warn("⚠️ Content script non disponible, injection...");

              // Injecter le content script
              chrome.tabs.executeScript(
                currentTab.id,
                { file: "content.js" },
                () => {
                  if (chrome.runtime.lastError) {
                    logger.error(
                      "❌ Impossible d'injecter le content script:",
                      chrome.runtime.lastError
                    );
                    sendResponse({
                      success: false,
                      error:
                        "Impossible d'injecter le content script. Rechargez la page.",
                    });
                    return;
                  }

                  logger.info("✅ Content script injecté, attente...");
                  setTimeout(() => {
                    sendMessageToContentScript(
                      currentTab.id,
                      message,
                      sendResponse
                    );
                  }, 2000);
                }
              );
            } else {
              logger.info("✅ Content script disponible:", pingResponse);
              sendMessageToContentScript(currentTab.id, message, sendResponse);
            }
          }
        );
      });
    } catch (error) {
      logger.error("❌ Erreur dans handleAnalyzeCurrentPage:", error);
      sendResponse({
        success: false,
        error: "Erreur interne: " + error.message,
      });
    }
  }

  function sendMessageToContentScript(tabId, message, sendResponse) {
    logger.info("📨 Envoi message au content script...");

    chrome.tabs.sendMessage(
      tabId,
      {
        action: "analyzePage",
        model: message.model,
        language: message.language,
        length: message.length,
        customPrompt: message.customPrompt,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          logger.error(
            "❌ Erreur communication content script:",
            chrome.runtime.lastError
          );
          sendResponse({
            success: false,
            error: "Content script non disponible. Rechargez la page.",
          });
        } else {
          logger.info("✅ Réponse du content script reçue");
          sendResponse(
            response || {
              success: false,
              error: "Réponse vide du content script",
            }
          );
        }
      }
    );
  }

  function handleGetSettings(message, sendResponse) {
    try {
      logger.info("🔍 Récupération settings:", message.keys);

      chrome.storage.sync.get(message.keys, (syncResult) => {
        if (chrome.runtime.lastError) {
          logger.info("⚠️ Erreur storage.sync, fallback local");
          chrome.storage.local.get(message.keys, (localResult) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: "Impossible d'accéder au storage",
              });
            } else {
              // Filtrer les prompts système vides avant de renvoyer
              if (localResult && localResult.systemPrompts) {
                localResult.systemPrompts = filterAvailableSystemPrompts(
                  localResult.systemPrompts
                );
              }
              sendResponse({ success: true, data: localResult || {} });
            }
          });
        } else {
          // Filtrer les prompts système vides avant de renvoyer
          if (syncResult && syncResult.systemPrompts) {
            syncResult.systemPrompts = filterAvailableSystemPrompts(
              syncResult.systemPrompts
            );
          }
          sendResponse({ success: true, data: syncResult || {} });
        }
      });
    } catch (error) {
      logger.error("❌ Erreur getSettings:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async function handleGenerateSummary(data, sendResponse) {
    logger.info("🎯 Début generateSummary avec:", {
      hasText: !!data.text,
      textLength: data.text?.length,
      language: data.language,
      length: data.length,
      model: data.model,
    });

    try {
      // Récupérer la clé API ET les prompts système
      logger.info("📥 Récupération clé API et prompts système...");
      const options = await new Promise((resolve) => {
        chrome.storage.sync.get(
          [
            "claudeApiKey",
            "summaryLanguage",
            "summaryLength",
            "claudeModel",
            "systemPrompts",
          ],
          (result) => {
            if (chrome.runtime.lastError) {
              chrome.storage.local.get(
                [
                  "claudeApiKey",
                  "summaryLanguage",
                  "summaryLength",
                  "claudeModel",
                  "systemPrompts",
                ],
                (localResult) => {
                  resolve(localResult || {});
                }
              );
            } else {
              resolve(result || {});
            }
          }
        );
      });

      logger.info("⚙️ Paramètres récupérés:", {
        hasApiKey: !!options.claudeApiKey,
        apiKeyStart: options.claudeApiKey?.substring(0, 12) + "...",
        language: options.summaryLanguage,
        length: options.summaryLength,
        model: options.claudeModel,
      });

      if (!options.claudeApiKey) {
        logger.error("❌ Pas de clé API trouvée");
        sendResponse({
          success: false,
          error:
            "Clé API Claude non configurée. Allez dans les options de l'extension.",
        });
        return;
      }

      // Utiliser les paramètres de l'utilisateur ou les valeurs par défaut
      const language = data.language || options.summaryLanguage || "fr";
      const length = data.length || options.summaryLength || "medium";
      const model =
        data.model || options.claudeModel || "claude-3-5-sonnet-20241022";

      logger.info("🔧 Paramètres finaux:", { language, length, model });

      // Récupérer les prompts système et les filtrer
      const systemPrompts = filterAvailableSystemPrompts(
        options.systemPrompts || {}
      );
      const defaultPrompts = {
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

      // Fonction utilitaire pour exposer les prompts (utilisée par les menus contextuels)
      function getAvailablePrompts() {
        return new Promise((resolve) => {
          chrome.storage.sync.get(
            ["systemPrompts", "customPrompts"],
            (result) => {
              if (chrome.runtime.lastError) {
                chrome.storage.local.get(
                  ["systemPrompts", "customPrompts"],
                  (localResult) => {
                    if (localResult && localResult.systemPrompts) {
                      localResult.systemPrompts = filterAvailableSystemPrompts(
                        localResult.systemPrompts
                      );
                    }
                    resolve(localResult || {});
                  }
                );
              } else {
                if (result && result.systemPrompts) {
                  result.systemPrompts = filterAvailableSystemPrompts(
                    result.systemPrompts
                  );
                }
                resolve(result || {});
              }
            }
          );
        });
      }

      // Fusion des prompts par défaut avec les prompts personnalisés filtrés
      const finalPrompts = { ...defaultPrompts, ...systemPrompts };

      // Vérifier si le prompt demandé existe
      if (!finalPrompts[length] && length !== "custom") {
        logger.warn(
          `⚠️ Prompt "${length}" supprimé ou indisponible, utilisation du prompt summary par défaut`
        );
        length = "summary";
      }

      // Déterminer les paramètres selon la longueur
      let maxTokens, maxInputChars, prompt;

      switch (length) {
        case "short":
          maxTokens = 300;
          maxInputChars = 8000;
          prompt = `📝 RÉSUMÉ COURT demandé en ${
            language === "fr" ? "français" : "anglais"
          }:

Consigne STRICTE: Produis un résumé de 2-3 paragraphes SEULEMENT (150-200 mots maximum).

Format attendu:
- 1er paragraphe: Sujet principal et objectif
- 2ème paragraphe: 2-3 points clés essentiels  
- 3ème paragraphe (optionnel): Conclusion/takeaway

Texte à résumer:
${data.text.substring(0, maxInputChars)}`;
          break;

        case "long":
          maxTokens = 1500;
          maxInputChars = 12000;
          prompt = `📝 RÉSUMÉ DÉTAILLÉ demandé en ${
            language === "fr" ? "français" : "anglais"
          }:

Consigne STRICTE: Produis un résumé structuré et complet (600-800 mots).

Format attendu:
## Sujet principal
## Points clés développés
- Point 1 avec explications
- Point 2 avec explications  
- Point 3 avec explications
## Détails techniques/exemples (si applicable)
## Conclusion et implications

Texte à résumer:
${data.text.substring(0, maxInputChars)}`;
          break;

        case "very_long":
          maxTokens = 4000;
          maxInputChars = 20000;
          prompt = `📝 RÉSUMÉ TRÈS DÉTAILLÉ demandé en ${
            language === "fr" ? "français" : "anglais"
          }:

🎯 CONSIGNE ABSOLUE: Tu DOIS produire un résumé TRÈS LONG et COMPLET (1500-2500 mots minimum).

📋 STRUCTURE OBLIGATOIRE:
## 🎯 Vue d'ensemble
[Contexte général et objectifs - 1 paragraphe développé]

## 📚 Contenu principal  
[Développement détaillé de tous les points abordés - plusieurs paragraphes]

## 🔍 Détails techniques et exemples
[Tous les éléments spécifiques, chiffres, exemples concrets]

## 💡 Points secondaires et nuances
[Aspects supplémentaires, mentions adjacentes]

## 🎯 Conclusions et implications
[Takeaways, applications pratiques]

⚠️ IMPORTANT: N'omets AUCUN détail important. Développe chaque section complètement. INTERDICTION de faire un résumé court!

Texte à résumer:
${data.text.substring(0, maxInputChars)}`;
          break;

        case "summary":
          maxTokens = 800;
          maxInputChars = 10000;
          prompt = `📝 RÉSUMÉ COMPLET demandé en ${
            language === "fr" ? "français" : "anglais"
          }:
  
  ${finalPrompts.summary}
  
  Texte à résumer:
  ${data.text.substring(0, maxInputChars)}`;
          break;

        case "key_points":
          maxTokens = 600;
          maxInputChars = 10000;
          prompt = `🎯 POINTS CLÉS demandés en ${
            language === "fr" ? "français" : "anglais"
          }:
  
  ${finalPrompts.key_points}
  
  Texte à analyser:
  ${data.text.substring(0, maxInputChars)}`;
          break;

        case "analysis":
          maxTokens = 1000;
          maxInputChars = 10000;
          prompt = `🔍 ANALYSE DÉTAILLÉE demandée en ${
            language === "fr" ? "français" : "anglais"
          }:
  
  ${finalPrompts.analysis}
  
  Texte à analyser:
  ${data.text.substring(0, maxInputChars)}`;
          break;

        case "questions":
          maxTokens = 1000;
          maxInputChars = 10000;
          prompt = `❓ QUESTIONS/RÉPONSES demandées en ${
            language === "fr" ? "français" : "anglais"
          }:
  
  ${finalPrompts.questions}
  
  Texte à analyser:
  ${data.text.substring(0, maxInputChars)}`;
          break;

        case "translation":
          maxTokens = 1200;
          maxInputChars = 12000;
          const languageNames = {
            fr: "français",
            en: "anglais",
            es: "espagnol",
            de: "allemand",
            it: "italien",
          };
          const targetLanguage = languageNames[language] || "français";
          prompt = `🌍 TRADUCTION demandée en ${targetLanguage}:
    
    ${finalPrompts.translation}
    
    Texte à traduire:
    ${data.text.substring(0, maxInputChars)}`;
          break;

        case "explanation":
          maxTokens = 1000;
          maxInputChars = 10000;
          prompt = `💡 EXPLICATION SIMPLE demandée en ${
            language === "fr" ? "français" : "anglais"
          }:
  
  ${finalPrompts.explanation}
  
  Texte à expliquer:
  ${data.text.substring(0, maxInputChars)}`;
          break;

        case "custom":
          maxTokens = 1000;
          maxInputChars = 10000;
          prompt = data.customPrompt
            ? `🎨 DEMANDE PERSONNALISÉE en ${
                language === "fr" ? "français" : "anglais"
              }:
  
  ${data.customPrompt}
  
  Texte à analyser:
  ${data.text.substring(0, maxInputChars)}`
            : `📝 RÉSUMÉ STANDARD demandé en ${
                language === "fr" ? "français" : "anglais"
              }:
  
  Fais un résumé équilibré de ce contenu.
  
  Texte à résumer:
  ${data.text.substring(0, maxInputChars)}`;
          break;

        default: // medium
          maxTokens = 800;
          maxInputChars = 10000;
          prompt = `📝 RÉSUMÉ ÉQUILIBRÉ demandé en ${
            language === "fr" ? "français" : "anglais"
          }:

Consigne STRICTE: Produis un résumé bien structuré (400-500 mots).

Format attendu:
## Aperçu
## Contenu principal
- Points importants développés
## Détails notables  
## Conclusion

Texte à résumer:
${data.text.substring(0, maxInputChars)}`;
      }

      logger.info("📊 Configuration pour l'API:", {
        maxTokens,
        maxInputChars,
        promptLength: prompt.length,
        textTruncated: data.text.length > maxInputChars,
      });

      // Préparer la requête
      const requestBody = {
        model: model,
        max_tokens: maxTokens,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      };

      logger.info("📡 Envoi à Claude API...");
      logger.info("📊 Body preview:", {
        model: requestBody.model,
        max_tokens: requestBody.max_tokens,
        messagesCount: requestBody.messages.length,
        contentLength: requestBody.messages[0].content.length,
      });

      // Appel API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": options.claudeApiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify(requestBody),
      });

      logger.info("📨 Réponse reçue de Claude:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error("❌ Erreur API Claude:", {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
        });

        sendResponse({
          success: false,
          error: `Erreur API Claude: ${response.status} ${response.statusText}\n${errorText}`,
        });
        return;
      }

      const result = await response.json();
      logger.info("✅ Réponse Claude parsée:", {
        hasContent: !!result.content,
        contentLength: result.content?.[0]?.text?.length,
        type: result.content?.[0]?.type,
        usage: result.usage,
      });

      // Vérifier la structure de la réponse
      if (!result.content || !result.content[0] || !result.content[0].text) {
        logger.error("❌ Structure de réponse invalide:", result);
        sendResponse({
          success: false,
          error: "Structure de réponse API invalide",
        });
        return;
      }

      const summary = result.content[0].text;
      logger.info("📝 Résumé extrait:", {
        length: summary.length,
        firstChars: summary.substring(0, 100) + "...",
        hasContent: summary.trim().length > 0,
      });

      if (!summary.trim()) {
        logger.error("❌ Résumé vide reçu");
        sendResponse({
          success: false,
          error: "Résumé vide reçu de Claude",
        });
        return;
      }

      logger.info("✅ Envoi de la réponse de succès");
      sendResponse({
        success: true,
        summary: summary.trim(),
        usage: result.usage,
      });
    } catch (error) {
      logger.error("💥 Erreur dans handleGenerateSummary:", error);
      logger.error("📋 Stack trace:", error.stack);

      sendResponse({
        success: false,
        error: `Erreur inattendue: ${error.message}`,
      });
    }
  }

  // Gestion des erreurs globales
  self.addEventListener("error", (event) => {
    logger.error("❌ Erreur globale dans le background script:", event.error);
  });

  self.addEventListener("unhandledrejection", (event) => {
    logger.error("❌ Promise rejetée non gérée:", event.reason);
  });

  logger.info("✅ Background script Anthropoïd initialisé");
})().catch(console.error);
