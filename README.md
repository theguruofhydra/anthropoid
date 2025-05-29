<h1 align="left">
  <img src="icons/icon-64.png" alt="Anthropoïd Icon" width="32" style="vertical-align: middle;"/>
  Anthropoïd
</h1>

![Version](https://img.shields.io/badge/version-0.9%20beta-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Firefox](https://img.shields.io/badge/firefox-supported-blue)

<p>
  <b>Firefox extension to analyze web content using Claude AI — Videos, PDFs, web pages, text selections, and more.</b>
</p>
---

## 🚧 v0.9 Beta – Early Preview Release  
> ⚠️ This is a beta version and may contain bugs. Report issues on [GitHub](https://github.com/theguruofhydra/anthropoid/issues).

---

## 🌟 Features

### 📄 **Universal Content Analysis**
- **📰 Full Web Pages** — Extract and analyze main content automatically
- **📄 PDF Documents** — Text extraction and AI-powered summarization  
- **🎬 YouTube & Piped Videos** — Analyze subtitles with smart platform detection
- **📝 Text Selections** — Right-click to analyze any highlighted text
- **🔍 Smart Content Detection** — Automatic identification of content types

### 🎯 **Intelligent Analysis Types**
- **📝 Full Summary** — Structured and detailed overviews
- **🎯 Key Points** — Bullet-point essential information extraction
- **🔍 In-Depth Analysis** — Contextual deep-dives and breakdowns
- **❓ Q&A Generation** — Auto-generated questions with answers
- **🌍 Translation** — Multi-language content translation
- **💡 Simple Explanations** — Beginner-friendly content breakdowns
- **🎨 Custom Analysis** — Your own personalized instructions

### 🎨 **Advanced Prompt Management**
- **✏️ Custom Prompt Creation** — Build your own analysis templates
- **🎛️ Individual Prompt Control** — Enable/disable default prompts selectively
- **📤 Prompt Import/Export** — Share configurations with others
- **🔧 Real-time Prompt Editor** — Live editing with immediate preview
- **🗂️ Prompt Organization** — Manage system and custom prompts separately

### 💬 **Integrated Conversation Mode**
- **💭 Chat Interface** — Continue discussions about analyzed content
- **🧠 Context-Aware Follow-ups** — Ask questions with full content memory
- **📚 Conversation History** — Track your analysis discussions
- **🔄 Multi-turn Conversations** — Deep-dive into complex topics
- **💾 Session Management** — Save and resume conversations

### 🤖 **Smart Claude AI Integration**
- **🔍 Automatic Model Detection** — Discovery of available Claude models
- **⚙️ Flexible Model Selection** — Choose from Haiku, Sonnet, Opus, and newer versions
- **🎯 Optimized Prompting** — Tailored requests for each analysis type
- **🛡️ Error Handling** — Graceful API failure recovery and retry logic
- **📊 Usage Optimization** — Smart token management and cost efficiency

### 🌐 **Multi-Platform & Access**
- **🖱️ Multiple Access Methods** — Right-click menu, popup, or standalone tab
- **🎨 Interface Modes** — Classic popup or full-featured standalone mode
- **⚡ Quick Actions** — Floating buttons on supported pages
- **⌨️ Keyboard Shortcuts** — Efficient navigation (Ctrl+Enter, Escape, Alt+Enter)
- **📱 Responsive Design** — Adapts to all screen sizes

### 🔧 **Configuration & Customization**
- **🔄 Firefox Sync Support** — Settings synchronized across devices
- **🌓 Theme System** — Auto, light, and dark modes with Firefox integration
- **🐛 Debug Mode** — Verbose logging for troubleshooting
- **💾 Auto-save Configuration** — Instant settings persistence
- **🌍 Multi-language Interface** — 5 languages supported

### 🔒 **Privacy & Security**
- **🔐 Local Encrypted Storage** — Secure API key management
- **🚫 Zero Telemetry** — No tracking, analytics, or data collection
- **🎯 Direct API Communication** — No proxy servers or intermediaries
- **📴 Offline-capable Setup** — Configure without internet connection
- **🔒 Privacy-first Design** — Your data stays on your device

---

## 🌍 Supported Languages

**Interface Languages:**
- 🇬🇧 English  
- 🇫🇷 French  
- 🇪🇸 Spanish  
- 🇩🇪 German  
- 🇮🇹 Italian

**Analysis Output Languages:**
- All languages supported by Claude AI

---

## 📸 Screenshots

*Coming soon - Screenshots of the interface, analysis results, and conversation mode*

---

## ⚙️ Setup & Configuration

### 🔑 Claude API Key (Required)

1. **Visit** [console.anthropic.com](https://console.anthropic.com/)  
2. **Create account** and generate an API key  
3. **Format:** `sk-ant-api03-...`
4. **Add to extension** via Options page

### 🔧 Piped API URL (Optional)

**For YouTube video analysis:**
- Only needed for custom Piped instances  
- ⚠️ Public instances may be unreliable due to rate limiting
- **Popular instances:** `https://pipedapi.kavin.rocks`, `https://piped-api.privacy.com.de`

### 🎛️ Advanced Configuration

#### Model Selection
- **Auto-detection** of available Claude models
- **Manual selection** from Haiku, Sonnet, Opus families
- **Performance vs Cost** optimization options

#### Custom Prompts
- **System prompt modification** — Edit default analysis types
- **Custom prompt creation** — Build your own templates
- **Prompt sharing** — Import/export configurations

---

## 🚀 Usage

### 🖱️ **Right-click Menu**
1. **Select text** or use on any page
2. **Right-click** → "Analyser avec Anthropoïd"
3. **Choose analysis type** from submenu
4. **View results** in new tab

### 🎯 **Browser Popup**
1. **Click extension icon** in toolbar
2. **Configure settings** (model, language, analysis type)
3. **Click "Analyser"** for current page
4. **Copy or continue** conversation

### 📑 **Standalone Mode**
1. **Open via** right-click or popup
2. **Full-featured interface** with conversation
3. **Multi-turn discussions** with Claude
4. **Session management** and history

---

## ⚠️ Known Limitations

- **📄 PDF Analysis** — Requires text-selectable PDFs (not scanned images)
- **🎬 Video Content** — Subtitle-dependent (no audio analysis yet)
- **🔄 Rate Limits** — Subject to Claude API usage limits
- **🌐 Chrome Support** — Not yet available (Firefox only)
- **📱 Mobile** — Firefox for Android support planned for v2.1+

---

### **Contributing**
- 🐛 **Bug reports:** Use [GitHub Issues](https://github.com/theguruofhydra/anthropoid/issues)
- 💡 **Feature requests:** Welcome! Discuss first in [GitHub Discussions](https://github.com/theguruofhydra/anthropoid/discussions)
- 🔀 **Pull requests:** Please open an issue first to discuss changes

---

## 🚀 Roadmap (v1.0+)

- 📱 **Firefox for Android** support  
- 🎥 **Invidious** video support  
- 📊 **Claude API usage** quota display  
- 🧠 **Whisper integration** for videos without subtitles  
- 📺 **Improved embedded content** support
- 🎨 **Custom CSS** styling options
- 🧭 **Firefox sidebar** integration  
- 🌐 **Chrome/Edge support**

---

## 💬 Community & Support

- 🐛 **Issues & Bugs:** [GitHub Issues](https://github.com/theguruofhydra/anthropoid/issues)
- 💡 **Feature Discussions:** [GitHub Discussions](https://github.com/theguruofhydra/anthropoid/discussions)
- 📖 **Documentation:** [Project Wiki](https://github.com/theguruofhydra/anthropoid/wiki)
- ☕ **Support Development:** [Ko-fi](https://ko-fi.com/theguruofhydra)

---

## 📄 License

Released under the **[MIT License](./LICENSE)**

---

## 🙏 Acknowledgments

- **Anthropic** for the amazing Claude API
- **Mozilla** for the Firefox extension platform
- **Open source community** for inspiration and feedback

---

<div align="center">

**Made with 👆 by [theguruofhydra](https://github.com/theguruofhydra)**

*If you find this project useful, consider [supporting its development](https://ko-fi.com/theguruofhydra)* ☕

</div>
