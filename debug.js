/*!
 * Anthropoïd
 * Copyright (c) 2025 theguruofhydra
 * Licensed under MIT License
 * https://github.com/theguruofhydra/anthropoid
 */

// debug.js - Script de test pour vérifier l'injection du content script

// À utiliser dans la console du popup pour diagnostiquer les problèmes

(async function () {
  const logger = await getLogger();

  async function debugContentScriptInjection() {
    logger.info("🔍 === DEBUG CONTENT SCRIPT INJECTION ===");

    try {
      // 1. Vérifier l'onglet actif
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      if (!tabs || tabs.length === 0) {
        logger.error("❌ Aucun onglet actif");
        return;
      }

      const tab = tabs[0];
      logger.info("📋 Onglet actif:", {
        id: tab.id,
        url: tab.url,
        status: tab.status,
      });

      // 2. Tester la connectivité avec ping
      logger.info("🔍 Test ping content script...");

      const pingResponse = await new Promise((resolve) => {
        chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
          if (chrome.runtime.lastError) {
            logger.info("❌ Erreur ping:", chrome.runtime.lastError.message);
            resolve(null);
          } else {
            resolve(response);
          }
        });
      });

      if (pingResponse) {
        logger.info("✅ Content script répond:", pingResponse);
        return;
      }

      // 3. Essayer d'injecter manuellement
      logger.info("🔧 Tentative d'injection manuelle...");

      const injectionResult = await new Promise((resolve) => {
        chrome.tabs.executeScript(
          tab.id,
          {
            file: "content.js",
          },
          (result) => {
            if (chrome.runtime.lastError) {
              logger.error(
                "❌ Erreur injection:",
                chrome.runtime.lastError.message
              );
              resolve(false);
            } else {
              logger.info("✅ Injection réussie:", result);
              resolve(true);
            }
          }
        );
      });

      if (injectionResult) {
        // 4. Retester après injection
        setTimeout(async () => {
          logger.info("🔍 Nouveau test ping après injection...");

          const newPingResponse = await new Promise((resolve) => {
            chrome.tabs.sendMessage(tab.id, { action: "ping" }, (response) => {
              if (chrome.runtime.lastError) {
                logger.info(
                  "❌ Erreur ping post-injection:",
                  chrome.runtime.lastError.message
                );
                resolve(null);
              } else {
                resolve(response);
              }
            });
          });

          if (newPingResponse) {
            logger.info(
              "✅ Content script fonctionne maintenant:",
              newPingResponse
            );
          } else {
            logger.error(
              "❌ Content script toujours non disponible après injection"
            );
          }
        }, 2000);
      }
    } catch (error) {
      logger.error("❌ Erreur debug:", error);
    }
  }

  // Test simple de connectivité
  async function quickPing() {
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });

    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "ping" }, (response) => {
        if (chrome.runtime.lastError) {
          logger.info("❌ Ping failed:", chrome.runtime.lastError.message);
        } else {
          logger.info("✅ Ping success:", response);
        }
      });
    }
  }

  // Vérifier les permissions
  function checkPermissions() {
    chrome.permissions.getAll((permissions) => {
      logger.info("🔐 Permissions actuelles:", permissions);
    });
  }

  // Vérifier le manifest
  function checkManifest() {
    const manifest = chrome.runtime.getManifest();
    logger.info("📄 Content scripts config:", manifest.content_scripts);
    logger.info("🔐 Permissions:", manifest.permissions);
  }

  // Instructions d'utilisation
  logger.info(`
  🔧 === OUTILS DE DEBUG CONTENT SCRIPT ===
  
  Utilisez ces fonctions dans la console :
  
  1. debugContentScriptInjection() - Debug complet
  2. quickPing() - Test rapide de connectivité  
  3. checkPermissions() - Vérifier les permissions
  4. checkManifest() - Vérifier la config
  
  Exemple d'utilisation :
  debugContentScriptInjection();
  `);

  // Export pour utilisation globale
  window.debugCS = {
    debug: debugContentScriptInjection,
    ping: quickPing,
    permissions: checkPermissions,
    manifest: checkManifest,
  };
})().catch(console.error);
