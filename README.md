# 🧠 AI-Powered Product Data Extractor – Chrome Extension

This is a Chrome extension that leverages Google Gemini (Gemini Pro API) and the Baxus API to scrape, summarize, and extract structured product data (names, prices, URLs) from webpages. It allows users to get clean, structured output of collectible product data like rare whiskies directly from pages like [baxus.co](https://www.baxus.co).

## 🚀 Features

- ✅ Scrape content from the currently open tab
- 🧠 Uses **Gemini Pro (via PaLM API)** to:
  - Extract relevant JSON data (name, price, product URL)
  - Summarize product details
- 📦 Matches product details with backend data via the **Baxus API**
- 🛠️ Simple popup UI for interaction

---

## 🧠 AI-Powered Approach

We use **Gemini Pro (PaLM API)** to analyze unstructured page content and extract structured product data in the form of a JSON array. The prompt to Gemini requests strictly formatted JSON and asks it to extract specific fields:
- `Product name`
- `Price`
- `Product URL`



This combines **GenAI's natural language understanding** with **programmatic resilience** for extracting clean product data.

---

## 🧰 Tech Stack

- **Chrome Extension** (Manifest V3)
- **Vanilla JavaScript / HTML / CSS**
- **Google Gemini API (PaLM)**
- **Baxus API** for product validation

---

## 📦 Installation & Local Development

### 1. Clone the Repository

```bash
git clone https://github.com/geeky-hypertext629/AI-Baxus-Bottle-Comparator
cd AI-Baxus-Bottle-Comparator
```
### 2. Create your own gemini API key

```bash
visit https://aistudio.google.com/app/apikey
Login to your google account
click I accept
click Create API key
copy API key visible on your screen 
```


### 3. Load the extension in chrome

```bash
Open Chrome and go to chrome://extensions/
Enable Developer Mode (top right)
Click "Load unpacked"
Select the root directory of the project
```
### 4. Usage

```bash
Open bottle page in any website
Click the extension icon from your Chrome toolbar
Select Baxus Bottle Comparator
Now paste the API key you generated from gemini and submit
Now Select the Baxus Bottle comparator again from the list of extensions
Now click the Analyze button
A short description of the prouduct and similar products on Baxus will be listed.
```

