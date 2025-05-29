/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// conversation.js - Script pour la page de conversation dédiée

(async function () {
  const logger = await getLogger();

  logger.info("💬 Page de conversation chargée");

  document.addEventListener("DOMContentLoaded", async () => {
    logger.info("✅ DOM conversation chargé");

    // Éléments DOM
    const statusDiv = document.getElementById("statusDiv");
    const conversationHistory = document.getElementById("conversationHistory");
    const conversationInfo = document.getElementById("conversationInfo");
    const userInput = document.getElementById("userInput");
    const sendBtn = document.getElementById("sendBtn");
    const clearBtn = document.getElementById("clearBtn");
    const loading = document.getElementById("loading");
    const loadingText = document.getElementById("loadingText");
    const backToSourceBtn = document.getElementById("backToSourceBtn");
    const copyConversationBtn = document.getElementById("copyConversationBtn");

    // Variables globales
    let conversationData = null;
    let conversationMessages = []; // Historique complet pour Claude
    let sourceTabId = null;

    // Initialisation du gestionnaire de version
    await initVersionManager();

    // Initialisation du thème
    await initThemeManager();

    // Initialisation
    await initializeConversation();

    // Event listeners
    sendBtn.addEventListener("click", sendMessage);
    clearBtn.addEventListener("click", clearConversation);
    backToSourceBtn.addEventListener("click", goBackToSource);
    copyConversationBtn.addEventListener("click", copyConversation);

    // Raccourcis clavier
    userInput.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        sendMessage();
      }
    });

    async function initializeConversation() {
      try {
        logger.info("🔧 Initialisation de la conversation...");

        // Récupérer les données de conversation stockées
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
            "🎯 ID de la conversation:",
            latestResult.latest_analysis
          );

          const conversationResult = await new Promise((resolve) => {
            chrome.storage.local.get(
              [latestResult.latest_analysis],
              (result) => {
                if (chrome.runtime.lastError) {
                  logger.error(
                    "❌ Erreur récupération conversation:",
                    chrome.runtime.lastError
                  );
                  resolve(null);
                } else {
                  resolve(result);
                }
              }
            );
          });

          if (
            conversationResult &&
            conversationResult[latestResult.latest_analysis]
          ) {
            conversationData = conversationResult[latestResult.latest_analysis];
            logger.info(
              "✅ Données de conversation récupérées:",
              conversationData
            );

            // Nettoyer les données utilisées
            chrome.storage.local.remove([
              latestResult.latest_analysis,
              "latest_analysis",
            ]);
          }
        }

        if (!conversationData) {
          throw new Error(
            "Aucune donnée de conversation trouvée. Veuillez relancer depuis l'analyse."
          );
        }

        // Configurer l'interface
        await setupConversationInterface();

        // Vérifier la configuration API
        const hasValidConfig = await checkApiConfiguration();
        if (!hasValidConfig) {
          return;
        }

        logger.info("✅ Conversation prête");
      } catch (error) {
        logger.error("❌ Erreur initialisation conversation:", error);
        showStatus(error.message, "error");
      }
    }

    async function setupConversationInterface() {
      sourceTabId = conversationData.sourceTabId;

      // Mettre à jour les informations de conversation
      let infoText = "";
      if (conversationData.isSelection) {
        infoText = `Sélection depuis ${
          new URL(conversationData.sourceUrl).hostname
        }`;
      } else {
        infoText = `Page complète: ${
          new URL(conversationData.sourceUrl).hostname
        }`;
      }
      conversationInfo.textContent = infoText;

      // Initialiser l'historique avec l'analyse initiale
      if (conversationData.initialAnalysis) {
        // Créer l'historique des messages pour Claude
        conversationMessages = [
          {
            role: "user",
            content: `${
              conversationData.initialPrompt || "Analyse ce contenu:"
            }\n\n${conversationData.originalContent}`,
          },
          {
            role: "assistant",
            content: conversationData.initialAnalysis,
          },
        ];

        // Afficher l'analyse initiale
        displayInitialAnalysis();
      }

      // Activer l'interface
      sendBtn.disabled = false;
      userInput.disabled = false;
      userInput.focus();
    }

    function displayInitialAnalysis() {
      conversationHistory.innerHTML = `
      <div class="conversation-item initial">
        <div class="conversation-question">
          <div class="label">📊 Analyse initiale</div>
          <div class="content">
            ${
              conversationData.isSelection
                ? `Analyse du texte sélectionné depuis ${
                    new URL(conversationData.sourceUrl).hostname
                  }`
                : `Analyse complète de la page ${
                    new URL(conversationData.sourceUrl).hostname
                  }`
            }
          </div>
        </div>
        <div class="conversation-answer">
          <div class="label"><img src='icons/icon-32.png' width='16' height='16' alt='Anthropoïd'> Claude</div>
          <div class="content">${formatText(
            conversationData.initialAnalysis
          )}</div>
        </div>
      </div>
    `;
    }

    async function checkApiConfiguration() {
      try {
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ action: "checkApiKey" }, resolve);
        });

        if (!response || !response.success) {
          showStatus(
            "⚠️ Erreur de configuration. Vérifiez vos paramètres.",
            "error"
          );
          return false;
        }

        if (!response.hasApiKey || !response.isValid) {
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

    async function sendMessage() {
      const message = userInput.value.trim();

      if (!message) {
        showStatus("❌ Veuillez entrer votre question", "error");
        return;
      }

      if (!conversationMessages || conversationMessages.length === 0) {
        showStatus("❌ Aucune conversation en cours", "error");
        return;
      }

      try {
        showLoading(true);
        sendBtn.disabled = true;

        // Ajouter la question de l'utilisateur à l'historique
        conversationMessages.push({
          role: "user",
          content: message,
        });

        // Afficher la question immédiatement
        addMessageToHistory(message, "user");

        // Appeler Claude avec l'historique complet
        const response = await callClaude(conversationMessages);

        if (response) {
          // Ajouter la réponse à l'historique
          conversationMessages.push({
            role: "assistant",
            content: response,
          });

          // Afficher la réponse
          addMessageToHistory(response, "assistant");

          // Vider le champ de saisie
          userInput.value = "";

          hideStatus();
        } else {
          showStatus("❌ Erreur lors de la génération de la réponse", "error");
          // Retirer la question de l'historique en cas d'erreur
          conversationMessages.pop();
        }
      } catch (error) {
        logger.error("❌ Erreur envoi message:", error);
        showStatus(`❌ ${error.message}`, "error");
        // Retirer la question de l'historique en cas d'erreur
        conversationMessages.pop();
      } finally {
        showLoading(false);
        sendBtn.disabled = false;
        userInput.focus();
      }
    }

    async function callClaude(messages) {
      // Récupérer les paramètres
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

      const model = conversationData.model || "claude-3-5-sonnet-20241022";

      logger.info("Appel Claude avec", messages.length, "messages");

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

    function addMessageToHistory(message, sender) {
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

      // Scroll vers le bas
      conversationHistory.scrollTop = conversationHistory.scrollHeight;
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

    function escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }

    function clearConversation() {
      if (
        confirm(
          "⚠️ Effacer toute la conversation ? Cette action est irréversible."
        )
      ) {
        // Garder seulement l'analyse initiale
        if (conversationData.initialAnalysis) {
          conversationMessages = [
            conversationMessages[0], // Question initiale
            conversationMessages[1], // Réponse initiale
          ];
          displayInitialAnalysis();
        } else {
          conversationMessages = [];
          conversationHistory.innerHTML = `
          <div class="empty-state">
            <div class="icon">💭</div>
            <h3>Conversation effacée</h3>
            <p>Posez une nouvelle question pour commencer</p>
          </div>
        `;
        }

        userInput.value = "";
        logger.info("🗑️ Conversation effacée");
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

    async function copyConversation() {
      try {
        // Construire le texte de la conversation
        let conversationText = "# Conversation avec Claude\n\n";

        if (conversationData.isSelection) {
          conversationText += `**Source**: Sélection depuis ${conversationData.sourceUrl}\n\n`;
        } else {
          conversationText += `**Source**: ${conversationData.sourceUrl}\n\n`;
        }

        // Ajouter tous les messages
        for (let i = 0; i < conversationMessages.length; i += 2) {
          if (i === 0) {
            conversationText += "## Analyse initiale\n\n";
          } else {
            conversationText += `## Question ${Math.floor(i / 2)}\n\n`;
          }

          if (conversationMessages[i]) {
            conversationText += `**Vous**: ${conversationMessages[i].content}\n\n`;
          }

          if (conversationMessages[i + 1]) {
            conversationText += `**Claude**: ${
              conversationMessages[i + 1].content
            }\n\n`;
          }

          conversationText += "---\n\n";
        }

        await navigator.clipboard.writeText(conversationText);

        // Feedback visuel
        copyConversationBtn.textContent = "✅ Copié!";
        copyConversationBtn.style.backgroundColor = "#059669";

        setTimeout(() => {
          copyConversationBtn.textContent = "📋 Copier la conversation";
          copyConversationBtn.style.backgroundColor = "";
        }, 2000);
      } catch (error) {
        logger.error("❌ Erreur copie conversation:", error);
        showStatus("❌ Impossible de copier la conversation", "error");
      }
    }

    function showStatus(message, type) {
      statusDiv.textContent = message;
      statusDiv.className = `status ${type}`;
      statusDiv.style.display = "block";

      // Auto-hide après 5 secondes pour les messages de succès
      if (type === "success") {
        setTimeout(() => {
          hideStatus();
        }, 5000);
      }
    }

    function hideStatus() {
      statusDiv.style.display = "none";
    }

    function showLoading(show) {
      loading.style.display = show ? "block" : "none";
      sendBtn.disabled = show;
      clearBtn.disabled = show;
      userInput.disabled = show;

      if (show) {
        hideStatus();
      }
    }
  });

  // Gestion des raccourcis clavier globaux
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Fermer avec Escape
      window.close();
    }
  });
})().catch(console.error);
