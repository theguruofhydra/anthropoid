/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// content.js - Version universelle complète et corrigée

(async function () {
  "use strict";

  const logger = await getLogger();

  logger.info("🚀 Content script universal chargé");

  // Éviter les re-déclarations en vérifiant si déjà initialisé
  if (window.anthropoidInitialized) {
    logger.info("⚠️ Content script déjà initialisé, arrêt");
    return;
  }
  window.anthropoidInitialized = true;

  class UniversalContentAnalyzer {
    constructor() {
      this.currentUrl = window.location.href;
      this.contentType = this.detectContentType();
      this.selectedText = "";
      this.extractedContent = null;
      this.systemPrompts = null;
      this.isReady = false;
      this.videoId = null;
      this.platform = null;
      this.apiBase = null;

      logger.info(`📄 Type de contenu détecté: ${this.contentType}`);
      logger.info(`🔗 URL: ${this.currentUrl}`);

      this.init();
    }

    async init() {
      try {
        await this.loadSystemPrompts();

        // Initialiser selon le type de contenu
        switch (this.contentType) {
          case "video":
            await this.initVideoMode();
            break;
          case "pdf":
            await this.initPDFMode();
            break;
          case "webpage":
          default:
            await this.initWebpageMode();
            break;
        }

        this.setupMessageListener();
        this.isReady = true;

        logger.info("✅ Universal Content Analyzer initialisé");
      } catch (error) {
        logger.error("❌ Erreur initialisation:", error);
      }
    }

    detectContentType() {
      const url = this.currentUrl;
      const pathname = window.location.pathname.toLowerCase();

      // Vidéos (YouTube, Piped, etc.)
      if (
        url.includes("youtube.com/watch") ||
        url.includes("youtu.be/") ||
        url.includes("/watch?v=") ||
        pathname.includes("/watch")
      ) {
        return "video";
      }

      // PDFs
      if (
        pathname.endsWith(".pdf") ||
        url.includes(".pdf") ||
        document.contentType === "application/pdf"
      ) {
        return "pdf";
      }

      return "webpage";
    }

    async initVideoMode() {
      logger.info("🎬 Mode vidéo activé");
      this.videoId = this.extractVideoId();
      this.platform = this.detectPlatform();
      this.apiBase = await this.loadApiBase();

      logger.info("🎬 Infos vidéo:", {
        videoId: this.videoId,
        platform: this.platform,
        apiBase: this.apiBase,
      });

      // Ajouter le bouton si on est sur Piped
      /*if (this.platform === "piped" && this.videoId && this.apiBase) {
        await this.addVideoButton();
      }*/
    }

    async initPDFMode() {
      logger.info("📄 Mode PDF activé");
      this.setupTextSelection();
    }

    async initWebpageMode() {
      logger.info("🌐 Mode page web activé");
      this.setupTextSelection();
    }

    async addVideoButton() {
      try {
        // Attendre que la page soit chargée
        await this.waitForPageLoad();

        const button = this.createVideoButton();
        const container = this.findButtonContainer();

        if (container) {
          container.appendChild(button);
          logger.info("✅ Bouton vidéo ajouté au container");
        } else {
          // Position fixe en fallback
          button.style.cssText += `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            z-index: 1000 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          `;
          document.body.appendChild(button);
          logger.info("✅ Bouton vidéo en position fixe");
        }
      } catch (error) {
        logger.error("❌ Erreur ajout bouton:", error);
      }
    }

    createVideoButton() {
      const button = document.createElement("button");
      button.id = "Anthropoïd-video-btn";
      button.style.cssText = `
        background-color: #2d2d2d !important;
        color: #7ca3af !important;
        border: 1px solid rgb(107, 114, 128) !important;
        border-radius: 8px !important;
        padding: 8px 12px !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 6px !important;
        cursor: pointer !important;
        margin-left: 0.5rem !important;
        transition: all 0.2s !important;
      `;

      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <span>Résumer</span>
      `;

      button.addEventListener("mouseover", () => {
        button.style.backgroundColor = "#3d3d3d";
      });

      button.addEventListener("mouseout", () => {
        button.style.backgroundColor = "#2d2d2d";
      });

      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleVideoSummarize();
      });

      return button;
    }

    findButtonContainer() {
      // Chercher le container des boutons d'action
      const strategies = [
        // Stratégie 1: Chercher le bouton "Partager"
        () => {
          const shareButton = Array.from(
            document.querySelectorAll("button, a")
          ).find(
            (btn) =>
              btn.textContent?.toLowerCase().includes("partager") ||
              btn.textContent?.toLowerCase().includes("share")
          );
          return shareButton?.parentElement;
        },

        // Stratégie 2: Containers d'actions
        () =>
          document.querySelector(
            '[class*="action"], [class*="button"][class*="container"]'
          ),

        // Stratégie 3: Containers flex avec boutons
        () => {
          const containers = document.querySelectorAll('div[class*="flex"]');
          for (const container of containers) {
            const buttons = container.querySelectorAll("button, a");
            const textButtons = Array.from(buttons).filter(
              (btn) =>
                btn.textContent?.trim().length > 2 &&
                !btn.closest('[class*="control"]') &&
                !btn.closest('[class*="player"]')
            );
            if (textButtons.length >= 2) return container;
          }
          return null;
        },
      ];

      for (const strategy of strategies) {
        try {
          const result = strategy();
          if (result && result.offsetParent !== null) {
            logger.info("✅ Container trouvé:", result.className);
            return result;
          }
        } catch (error) {
          logger.info("⚠️ Erreur dans stratégie de recherche:", error);
        }
      }

      logger.info("❌ Aucun container approprié trouvé");
      return null;
    }

    async waitForPageLoad() {
      return new Promise((resolve) => {
        if (document.readyState === "complete") {
          setTimeout(resolve, 1000);
        } else {
          window.addEventListener("load", () => {
            setTimeout(resolve, 1000);
          });
        }
      });
    }

    async handleVideoSummarize() {
      logger.info("🎬 Analyse vidéo démarrée");

      const button = document.getElementById("Anthropoïd-video-btn");
      if (!button) {
        logger.error("❌ Bouton non trouvé");
        return;
      }

      const originalContent = button.innerHTML;

      try {
        // Changer l'état du bouton
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="animation: spin 1s linear infinite;">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          <span>Analyse...</span>
        `;
        button.disabled = true;

        // Ajouter l'animation de rotation
        if (!document.querySelector("#Anthropoïd-spin-style")) {
          const style = document.createElement("style");
          style.id = "Anthropoïd-spin-style";
          style.textContent = `
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
        }

        // Extraire sous-titres et analyser
        logger.info("📥 Extraction des sous-titres...");
        const subtitles = await this.extractSubtitles();

        logger.info("Génération du résumé...");
        const summary = await this.analyzeContent(
          subtitles,
          "summary",
          "fr",
          ""
        );

        this.showVideoSummary(summary);
      } catch (error) {
        logger.error("❌ Erreur analyse vidéo:", error);
        this.showError(`Erreur: ${error.message}`);
      } finally {
        // Restaurer bouton
        button.innerHTML = originalContent;
        button.disabled = false;
      }
    }

    setupTextSelection() {
      let selectionTimeout;

      const handleSelection = () => {
        const selection = window.getSelection().toString().trim();
        if (selection.length > 10) {
          this.selectedText = selection;
          // Notifier le background
          this.sendMessage({ action: "updateSelection", text: selection });
        }
      };

      document.addEventListener("mouseup", () => {
        clearTimeout(selectionTimeout);
        selectionTimeout = setTimeout(handleSelection, 200);
      });

      document.addEventListener("keyup", (e) => {
        if (
          e.shiftKey ||
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          clearTimeout(selectionTimeout);
          selectionTimeout = setTimeout(handleSelection, 200);
        }
      });
    }

    setupMessageListener() {
      // Écouter les messages du popup et background
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        logger.info("📨 Message reçu:", message);

        if (!this.isReady) {
          sendResponse({ success: false, error: "Content script non prêt" });
          return false;
        }

        this.handleMessage(message, sendResponse);
        return true; // Réponse asynchrone
      });
    }

    async handleMessage(message, sendResponse) {
      try {
        switch (message.action) {
          case "ping":
            sendResponse({
              success: true,
              status: "ready",
              contentType: this.contentType,
              videoId: this.videoId,
              platform: this.platform,
            });
            break;

          case "analyzePage":
            await this.handleAnalyzePage(message, sendResponse);
            break;

          case "analyzeSelection":
            await this.handleAnalyzeSelection(message, sendResponse);
            break;

          case "getPageContent":
            await this.handleGetPageContent(sendResponse);
            break;

          case "getVideoInfo":
            await this.handleGetVideoInfo(sendResponse);
            break;

          default:
            sendResponse({
              success: false,
              error: "Action non reconnue: " + message.action,
            });
        }
      } catch (error) {
        logger.error("❌ Erreur dans handleMessage:", error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleAnalyzePage(message, sendResponse) {
      logger.info("📊 Analyse de page demandée");

      try {
        let content = "";
        let contentInfo = {};

        switch (this.contentType) {
          case "video":
            logger.info("🎬 Extraction sous-titres pour analyse...");
            content = await this.extractSubtitles();
            contentInfo = {
              type: "video",
              platform: this.platform,
              videoId: this.videoId,
            };
            break;
          case "pdf":
            logger.info("📄 Extraction PDF pour analyse...");
            content = await this.extractPDFText();
            contentInfo = { type: "pdf", title: document.title };
            break;
          default:
            logger.info("🌐 Extraction page web pour analyse...");
            content = this.extractWebpageContent();
            contentInfo = {
              type: "webpage",
              title: document.title,
              url: window.location.href,
            };
        }

        logger.info("📝 Contenu extrait:", {
          length: content.length,
          type: this.contentType,
        });

        if (!content || content.length < 50) {
          throw new Error("Contenu insuffisant trouvé pour l'analyse");
        }

        const summary = await this.analyzeContent(
          content,
          message.length || "summary",
          message.language || "fr",
          message.customPrompt || ""
        );

        sendResponse({
          success: true,
          data: {
            summary: summary,
            contentInfo: contentInfo,
            contentType: this.contentType,
          },
        });
      } catch (error) {
        logger.error("❌ Erreur analyse page:", error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleAnalyzeSelection(message, sendResponse) {
      const selection = window.getSelection().toString().trim();

      if (!selection || selection.length < 10) {
        sendResponse({
          success: false,
          error: "Pas de sélection valide (minimum 10 caractères)",
        });
        return;
      }

      try {
        const summary = await this.analyzeContent(
          selection,
          message.analysisType || "summary",
          message.language || "fr",
          message.customPrompt || ""
        );

        sendResponse({
          success: true,
          data: {
            summary: summary,
            originalText: selection,
            contentType: "selection",
          },
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleGetPageContent(sendResponse) {
      try {
        let content = "";
        let contentInfo = {};

        switch (this.contentType) {
          case "video":
            content = await this.extractSubtitles();
            contentInfo = {
              type: "video",
              platform: this.platform,
              videoId: this.videoId,
            };
            break;
          case "pdf":
            content = await this.extractPDFText();
            contentInfo = { type: "pdf", title: document.title };
            break;
          default:
            content = this.extractWebpageContent();
            contentInfo = { type: "webpage", title: document.title };
        }

        sendResponse({
          success: true,
          data: {
            content: content,
            contentInfo: contentInfo,
            contentType: this.contentType,
          },
        });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    }

    async handleGetVideoInfo(sendResponse) {
      if (this.contentType !== "video") {
        sendResponse({ success: false, error: "Pas de vidéo sur cette page" });
        return;
      }

      sendResponse({
        success: true,
        data: {
          title: document.title,
          platform: this.platform,
          videoId: this.videoId,
          url: this.currentUrl,
          apiBase: this.apiBase,
        },
      });
    }

    async analyzeContent(content, analysisType, language, customPrompt) {
      logger.info("Analyse avec Claude...");
      logger.info("📋 Paramètres:", {
        analysisType,
        language,
        contentLength: content.length,
      });

      return new Promise((resolve, reject) => {
        this.sendMessage(
          {
            action: "generateSummary",
            data: {
              text: content,
              language: language,
              length: analysisType,
              customPrompt: customPrompt,
            },
          },
          (response) => {
            logger.info("📨 Réponse analyse:", response);

            if (!response) {
              reject(new Error("Aucune réponse du service d'analyse"));
              return;
            }

            if (response.success && response.summary) {
              logger.info("✅ Analyse réussie:", {
                length: response.summary.length,
              });
              resolve(response.summary);
            } else {
              logger.error("❌ Erreur analyse:", response.error);
              reject(
                new Error(response.error || "Erreur inconnue lors de l'analyse")
              );
            }
          }
        );
      });
    }

    // Méthodes d'extraction de contenu
    extractWebpageContent() {
      logger.info("🌐 Extraction contenu page web...");

      const selectors = [
        "article",
        "main",
        '[role="main"]',
        ".main-content",
        "#main",
        "#content",
        ".content",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim().length > 200) {
          logger.info(`✅ Contenu trouvé via sélecteur: ${selector}`);
          return this.cleanText(element.textContent);
        }
      }

      // Fallback: contenu du body en excluant navigation, sidebar, etc.
      logger.info("⚠️ Fallback: extraction depuis body");
      const bodyContent = this.cleanText(document.body.textContent);

      if (bodyContent.length < 100) {
        throw new Error("Contenu de page insuffisant trouvé");
      }

      return bodyContent;
    }

    async extractPDFText() {
      logger.info("📄 Extraction texte PDF...");

      // Méthode 1: PDF.js
      if (
        window.PDFViewerApplication &&
        window.PDFViewerApplication.pdfDocument
      ) {
        try {
          return await this.extractFromPDFJS();
        } catch (error) {
          logger.info("⚠️ Erreur PDF.js:", error);
        }
      }

      // Méthode 2: Layers de texte
      const textElements = document.querySelectorAll(
        "div[data-page] .textLayer div"
      );
      if (textElements.length > 0) {
        const text = Array.from(textElements)
          .map((el) => el.textContent)
          .join(" ");
        logger.info("✅ Texte extrait des layers:", text.length, "caractères");
        return this.cleanText(text);
      }

      // Méthode 3: Fallback
      logger.info("⚠️ Fallback: extraction générique");
      return this.extractWebpageContent();
    }

    async extractFromPDFJS() {
      const app = window.PDFViewerApplication;
      if (!app.pdfDocument) {
        throw new Error("Document PDF non chargé");
      }

      let fullText = "";
      const numPages = Math.min(app.pdfDocument.numPages, 50); // Limiter à 50 pages

      for (let i = 1; i <= numPages; i++) {
        const page = await app.pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        fullText += pageText + "\n\n";
      }

      return this.cleanText(fullText);
    }

    async extractSubtitles() {
      if (!this.videoId || !this.apiBase) {
        throw new Error("Informations vidéo manquantes");
      }

      logger.info("📡 Récupération sous-titres...");
      logger.info("🔗 URL API:", `${this.apiBase}/streams/${this.videoId}`);

      const response = await fetch(`${this.apiBase}/streams/${this.videoId}`);

      logger.info("📨 Réponse API streams:", {
        status: response.status,
        ok: response.ok,
        url: response.url,
      });

      if (!response.ok) {
        throw new Error(
          `Erreur API: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      logger.info("📋 Données vidéo:", {
        hasSubtitles: !!data.subtitles,
        subtitlesCount: data.subtitles?.length || 0,
        title: data.title,
      });

      if (!data.subtitles || data.subtitles.length === 0) {
        throw new Error("Aucun sous-titre disponible pour cette vidéo");
      }

      // Log des sous-titres disponibles
      logger.info("📑 Sous-titres disponibles:");
      data.subtitles.forEach((sub, i) => {
        logger.info(
          `  ${i}: ${sub.name} (${sub.code}) - ${
            sub.autoGenerated ? "Auto" : "Manuel"
          }`
        );
      });

      const subtitle = this.selectBestSubtitle(data.subtitles);
      logger.info("✅ Sous-titre sélectionné:", subtitle.name, subtitle.code);

      const subtitleResponse = await fetch(subtitle.url);
      logger.info("📨 Réponse sous-titres:", {
        status: subtitleResponse.status,
        ok: subtitleResponse.ok,
      });

      if (!subtitleResponse.ok) {
        throw new Error(
          `Erreur téléchargement sous-titres: ${subtitleResponse.status}`
        );
      }

      const subtitleContent = await subtitleResponse.text();
      logger.info("📄 Contenu sous-titres brut:", {
        length: subtitleContent.length,
        mimeType: subtitle.mimeType,
      });

      const parsedText = this.parseSubtitles(subtitleContent);
      logger.info("📝 Texte sous-titres parsé:", {
        length: parsedText.length,
        preview: parsedText.substring(0, 200) + "...",
      });

      return parsedText;
    }

    selectBestSubtitle(subtitles) {
      const preferredLanguages = ["fr", "fr-FR", "en", "en-US", "en-GB"];

      // Priorité 1: Sous-titres manuels dans les langues préférées
      for (const lang of preferredLanguages) {
        const manual = subtitles.find(
          (sub) => sub.code.startsWith(lang) && !sub.autoGenerated
        );
        if (manual) return manual;
      }

      // Priorité 2: Sous-titres auto dans les langues préférées
      for (const lang of preferredLanguages) {
        const auto = subtitles.find((sub) => sub.code.startsWith(lang));
        if (auto) return auto;
      }

      // Fallback: premier disponible
      return subtitles[0];
    }

    parseSubtitles(content) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(content, "text/xml");

        // Vérifier les erreurs de parsing
        const parseError = xmlDoc.querySelector("parsererror");
        if (parseError) {
          logger.info("⚠️ Erreur parsing XML, fallback...");
          return this.parseSubtitlesFallback(content);
        }

        const paragraphs = xmlDoc.querySelectorAll("p");
        if (paragraphs.length === 0) {
          logger.info("⚠️ Aucun paragraphe trouvé, recherche text...");
          const textElements = xmlDoc.querySelectorAll("text");
          if (textElements.length > 0) {
            return Array.from(textElements)
              .map((el) => el.textContent?.trim())
              .filter((text) => text && text.length > 0)
              .join(" ");
          }
          return this.parseSubtitlesFallback(content);
        }

        const text = Array.from(paragraphs)
          .map((p) => p.textContent?.trim())
          .filter((text) => text && text.length > 0)
          .join(" ");

        return this.cleanText(text);
      } catch (error) {
        logger.info("⚠️ Erreur parsing XML:", error);
        return this.parseSubtitlesFallback(content);
      }
    }

    parseSubtitlesFallback(content) {
      logger.info("🔧 Parsing fallback...");

      // Supprimer les balises XML/HTML et nettoyer
      let text = content
        .replace(/<[^>]*>/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      // Supprimer les timestamps
      text = text.replace(/\d{2}:\d{2}:\d{2}[.,]\d{3}/g, "");
      text = text.replace(/-->/g, "");

      return this.cleanText(text);
    }

    // Méthodes utilitaires
    extractVideoId() {
      const urlParams = new URLSearchParams(window.location.search);
      let videoId = urlParams.get("v");

      // Fallback pour youtu.be
      if (!videoId && this.currentUrl.includes("youtu.be/")) {
        const match = this.currentUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        if (match) videoId = match[1];
      }

      return videoId;
    }

    detectPlatform() {
      if (
        this.currentUrl.includes("youtube.com") ||
        this.currentUrl.includes("youtu.be")
      ) {
        return "youtube";
      }
      return "piped";
    }

    async loadApiBase() {
      if (this.platform === "piped") {
        // Pour Piped, construire l'URL API depuis l'URL actuelle
        let apiBase = `${window.location.protocol}//${window.location.hostname}`;
        if (window.location.port) {
          apiBase += `:${window.location.port}`;
        }
        if (!apiBase.endsWith("/api")) {
          apiBase += "/api";
        }
        return apiBase;
      }

      // Pour YouTube, utiliser Piped par défaut ou l'URL configurée
      try {
        const settings = await new Promise((resolve) => {
          chrome.storage.sync.get(["pipedApiUrl"], (result) => {
            if (chrome.runtime.lastError) {
              chrome.storage.local.get(["pipedApiUrl"], resolve);
            } else {
              resolve(result);
            }
          });
        });

        if (settings && settings.pipedApiUrl) {
          let apiBase = settings.pipedApiUrl;
          if (!apiBase.endsWith("/api")) {
            apiBase += apiBase.endsWith("/") ? "api" : "/api";
          }
          return apiBase;
        }
      } catch (error) {
        logger.info("⚠️ Erreur chargement config Piped:", error);
      }

      return "https://pipedapi.kavin.rocks";
    }

    async loadSystemPrompts() {
      try {
        const settings = await new Promise((resolve) => {
          chrome.storage.sync.get(["systemPrompts"], (result) => {
            if (chrome.runtime.lastError) {
              chrome.storage.local.get(["systemPrompts"], resolve);
            } else {
              resolve(result);
            }
          });
        });

        // Valeurs par défaut
        const defaultPrompts = {
          summary: "Fais un résumé complet et structuré de ce contenu.",
          key_points: "Extrais et liste les points clés de ce contenu.",
          analysis: "Fais une analyse détaillée de ce contenu.",
          questions:
            "Génère une série de questions importantes avec leurs réponses.",
          translation: "Traduis ce contenu en gardant le sens original.",
          explanation: "Explique ce contenu de manière simple et accessible.",
        };

        this.systemPrompts =
          settings && settings.systemPrompts
            ? { ...defaultPrompts, ...settings.systemPrompts }
            : defaultPrompts;

        logger.info("📝 Prompts système chargés");
      } catch (error) {
        logger.error("⚠️ Erreur chargement prompts:", error);
        this.systemPrompts = {
          summary: "Fais un résumé complet et structuré de ce contenu.",
          key_points: "Extrais et liste les points clés de ce contenu.",
          analysis: "Fais une analyse détaillée de ce contenu.",
        };
      }
    }

    cleanText(text) {
      if (!text) return "";

      return text
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n\n")
        .trim();
    }

    sendMessage(message, callback) {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            logger.error("❌ Erreur runtime:", chrome.runtime.lastError);
            if (callback)
              callback({
                success: false,
                error: chrome.runtime.lastError.message,
              });
          } else {
            if (callback) callback(response);
          }
        });
      } catch (error) {
        logger.error("❌ Erreur envoi message:", error);
        if (callback) callback({ success: false, error: error.message });
      }
    }

    showVideoSummary(summary) {
      logger.info("📖 Affichage du résumé vidéo...");

      // Supprimer la modal existante si elle existe
      const existingModal = document.getElementById("Anthropoïd-summary-modal");
      if (existingModal) {
        existingModal.remove();
      }

      // Créer la modal
      const modal = document.createElement("div");
      modal.id = "Anthropoïd-summary-modal";
      modal.style.cssText = `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        background-color: rgba(0, 0, 0, 0.7) !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        z-index: 10000 !important;
        backdrop-filter: blur(5px) !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      `;

      const content = document.createElement("div");
      content.style.cssText = `
        background: white !important;
        border-radius: 15px !important;
        max-width: 800px !important;
        max-height: 80vh !important;
        overflow-y: auto !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
        margin: 20px !important;
        animation: modalAppear 0.3s ease-out !important;
      `;

      const header = document.createElement("div");
      header.style.cssText = `
        background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
        color: white !important;
        padding: 20px !important;
        border-radius: 15px 15px 0 0 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      `;

      const title = document.createElement("h3");
      title.textContent = "📝 Résumé de la vidéo";
      title.style.cssText = `
        margin: 0 !important;
        font-size: 18px !important;
        font-weight: 600 !important;
        color: white !important;
      `;

      const closeBtn = document.createElement("button");
      closeBtn.textContent = "×";
      closeBtn.style.cssText = `
        background: none !important;
        border: none !important;
        color: white !important;
        font-size: 24px !important;
        cursor: pointer !important;
        padding: 0 !important;
        width: 30px !important;
        height: 30px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: background-color 0.2s !important;
      `;

      const summaryDiv = document.createElement("div");
      summaryDiv.style.cssText = `
        padding: 25px !important;
        font-size: 16px !important;
        line-height: 1.6 !important;
        color: #333 !important;
        background: #fafafa !important;
      `;

      // Formatter le texte markdown
      const formattedSummary = this.formatMarkdown(summary);
      summaryDiv.innerHTML = formattedSummary;

      const actions = document.createElement("div");
      actions.style.cssText = `
        padding: 20px !important;
        border-top: 1px solid #eee !important;
        display: flex !important;
        gap: 10px !important;
        justify-content: flex-end !important;
        background: white !important;
        border-radius: 0 0 15px 15px !important;
      `;

      const copyBtn = document.createElement("button");
      copyBtn.textContent = "📋 Copier";
      copyBtn.style.cssText = `
        padding: 10px 20px !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        background-color: #10b981 !important;
        color: white !important;
        transition: all 0.2s ease !important;
      `;

      const closeModalBtn = document.createElement("button");
      closeModalBtn.textContent = "✕ Fermer";
      closeModalBtn.style.cssText = `
        padding: 10px 20px !important;
        border: none !important;
        border-radius: 8px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        background-color: #6c757d !important;
        color: white !important;
        transition: all 0.2s ease !important;
      `;

      // Event listeners
      const closeModal = () => {
        logger.info("❌ Fermeture de la modal");
        modal.remove();
      };

      closeBtn.addEventListener("click", closeModal);
      closeModalBtn.addEventListener("click", closeModal);

      closeBtn.addEventListener("mouseover", () => {
        closeBtn.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
      });
      closeBtn.addEventListener("mouseout", () => {
        closeBtn.style.backgroundColor = "transparent";
      });

      copyBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(summary);
          copyBtn.textContent = "✅ Copié!";
          copyBtn.style.backgroundColor = "#059669";
          setTimeout(() => {
            copyBtn.textContent = "📋 Copier";
            copyBtn.style.backgroundColor = "#10b981";
          }, 2000);
          logger.info("📋 Résumé copié dans le presse-papier");
        } catch (error) {
          logger.error("❌ Erreur copie:", error);
          copyBtn.textContent = "❌ Erreur";
          copyBtn.style.backgroundColor = "#ef4444";
        }
      });

      copyBtn.addEventListener("mouseover", () => {
        if (copyBtn.textContent === "📋 Copier") {
          copyBtn.style.backgroundColor = "#059669";
        }
      });
      copyBtn.addEventListener("mouseout", () => {
        if (copyBtn.textContent === "📋 Copier") {
          copyBtn.style.backgroundColor = "#10b981";
        }
      });

      closeModalBtn.addEventListener("mouseover", () => {
        closeModalBtn.style.backgroundColor = "#5a6268";
      });
      closeModalBtn.addEventListener("mouseout", () => {
        closeModalBtn.style.backgroundColor = "#6c757d";
      });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          logger.info("❌ Clic en dehors de la modal, fermeture");
          closeModal();
        }
      });

      // Escape pour fermer
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          closeModal();
          document.removeEventListener("keydown", handleEscape);
        }
      };
      document.addEventListener("keydown", handleEscape);

      // Assemblage
      header.appendChild(title);
      header.appendChild(closeBtn);
      actions.appendChild(copyBtn);
      actions.appendChild(closeModalBtn);
      content.appendChild(header);
      content.appendChild(summaryDiv);
      content.appendChild(actions);
      modal.appendChild(content);

      // Ajouter l'animation CSS si pas déjà présente
      if (!document.querySelector("#Anthropoïd-modal-style")) {
        const styleSheet = document.createElement("style");
        styleSheet.id = "Anthropoïd-modal-style";
        styleSheet.textContent = `
          @keyframes modalAppear {
            from {
              opacity: 0;
              transform: scale(0.8) translateY(-50px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }
        `;
        document.head.appendChild(styleSheet);
      }

      // Ajout au DOM
      document.body.appendChild(modal);
      logger.info("✅ Modal de résumé affichée");
    }

    formatMarkdown(text) {
      return text
        .replace(
          /\*\*(.*?)\*\*/g,
          '<strong style="color: #1f2937; font-weight: 600;">$1</strong>'
        )
        .replace(
          /\*(.*?)\*/g,
          '<em style="color: #6b7280; font-style: italic;">$1</em>'
        )
        .replace(
          /^### (.*$)/gm,
          '<h3 style="color: #2c3e50; margin-top: 20px; margin-bottom: 10px; font-size: 1.1em;">$1</h3>'
        )
        .replace(
          /^## (.*$)/gm,
          '<h2 style="color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 1.3em;">$1</h2>'
        )
        .replace(
          /^# (.*$)/gm,
          '<h1 style="color: #2c3e50; margin-top: 20px; margin-bottom: 10px; font-size: 1.5em; border-bottom: 2px solid #10b981; padding-bottom: 5px;">$1</h1>'
        )
        .replace(/^- (.*$)/gm, '<li style="margin-bottom: 5px;">$1</li>')
        .replace(
          /(<li.*?<\/li>)/gms,
          '<ul style="margin: 15px 0; padding-left: 25px;">$1</ul>'
        )
        .replace(
          /`(.*?)`/g,
          '<code style="background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: Monaco, Consolas, monospace; font-size: 13px; color: #e11d48;">$1</code>'
        )
        .replace(/\n\n/g, '</p><p style="margin: 15px 0;">')
        .replace(/\n/g, "<br>");
    }

    showError(message) {
      logger.info("❌ Affichage erreur:", message);

      // Supprimer la notification existante
      const existingNotif = document.getElementById(
        "Anthropoïd-error-notification"
      );
      if (existingNotif) {
        existingNotif.remove();
      }

      const notification = document.createElement("div");
      notification.id = "Anthropoïd-error-notification";
      notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        background-color: #ef4444 !important;
        color: white !important;
        padding: 15px 20px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2) !important;
        z-index: 10001 !important;
        max-width: 350px !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        animation: slideInError 0.3s ease-out !important;
      `;

      notification.textContent = message;

      // Animation d'entrée
      if (!document.querySelector("#Anthropoïd-error-style")) {
        const styleSheet = document.createElement("style");
        styleSheet.id = "Anthropoïd-error-style";
        styleSheet.textContent = `
          @keyframes slideInError {
            from {
              opacity: 0;
              transform: translateX(100%);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
        `;
        document.head.appendChild(styleSheet);
      }

      document.body.appendChild(notification);

      // Auto-suppression après 5 secondes
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 5000);

      logger.info("✅ Notification d'erreur affichée");
    }
  }

  // Initialiser l'analyseur
  let analyzer = null;

  function initAnalyzer() {
    if (analyzer) {
      logger.info("⚠️ Analyzer déjà existant");
      return;
    }

    logger.info("🚀 Création de l'analyzer...");
    try {
      analyzer = new UniversalContentAnalyzer();
    } catch (error) {
      logger.error("❌ Erreur création analyzer:", error);
      // Retry après 2 secondes
      setTimeout(() => {
        analyzer = null;
        initAnalyzer();
      }, 2000);
    }
  }

  // Initialisation robuste selon l'état du document
  if (document.readyState === "loading") {
    logger.info("📄 Document en cours de chargement...");
    document.addEventListener("DOMContentLoaded", () => {
      logger.info("✅ DOMContentLoaded reçu");
      setTimeout(initAnalyzer, 500);
    });
  } else if (document.readyState === "interactive") {
    logger.info("📄 Document interactif...");
    setTimeout(initAnalyzer, 500);
  } else {
    logger.info("📄 Document complet...");
    setTimeout(initAnalyzer, 100);
  }

  // Backup - s'assurer que l'analyzer est créé
  setTimeout(() => {
    if (!analyzer) {
      logger.info("🔄 Backup - Création forcée de l'analyzer");
      initAnalyzer();
    }
  }, 3000);

  // Observer les changements d'URL pour les SPA
  let currentUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== currentUrl) {
      logger.info("🔄 URL changée:", currentUrl, "->", window.location.href);
      currentUrl = window.location.href;

      // Nettoyer l'ancien analyzer
      if (analyzer) {
        logger.info("🗑️ Nettoyage ancien analyzer");
        analyzer = null;
      }

      // Marquer comme non initialisé pour permettre la réinitialisation
      window.antropoidInitialized = false;

      // Recréer après un délai
      setTimeout(() => {
        logger.info("🔄 Recréation analyzer pour nouvelle URL");
        window.anthropoidInitialized = false;
        initAnalyzer();
      }, 1000);
    }
  });

  urlObserver.observe(document, {
    subtree: true,
    childList: true,
  });

  logger.info("✅ Content script Anthropoïd initialisé");
})().catch(console.error);
