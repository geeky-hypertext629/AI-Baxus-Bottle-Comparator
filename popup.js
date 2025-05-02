document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const apiKeySection = document.getElementById("apiKeySection")
  const mainContent = document.getElementById("mainContent")
  const apiKeyInput = document.getElementById("apiKey")
  const saveApiKeyBtn = document.getElementById("saveApiKey")
  const getSummaryBtn = document.getElementById("getSummary")
  const summaryResult = document.getElementById("summaryResult")
  const summaryContent = document.getElementById("summaryContent")

  let userSearchData = null;

  const statusMessage = document.getElementById("statusMessage")
  const loadingIndicator = document.getElementById("loadingIndicator")

  // Check if API key is already saved
  chrome.storage.local.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeySection.classList.add("hidden")
      mainContent.classList.remove("hidden")
    }
  })
  // Get product results


  // Save API key
  saveApiKeyBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim()
    if (apiKey) {
      chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        apiKeySection.classList.add("hidden")
        mainContent.classList.remove("hidden")
        showStatus("API key saved successfully!", "success")
      })
    } else {
      showStatus("Please enter a valid API key", "error")
    }
  })

  // Get page summary
  getSummaryBtn.addEventListener("click", () => {
    showLoading(true)
    summaryResult.classList.add("hidden")

    // Get the current tab's content
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]

      // Execute script to get page content
      chrome.scripting.executeScript(
        {
          target: { tabId: activeTab.id },
          function: scrapePageContent,
        },
        async (results) => {
          if (chrome.runtime.lastError) {
            showStatus("Error: " + chrome.runtime.lastError.message, "error")
            showLoading(false)
            return
          }

          const pageContent = results[0].result
          const pageUrl = activeTab.url
          const pageTitle = activeTab.title

          try {
            const summary = await getGeminiResponse(
              pageContent,
              pageUrl,
              pageTitle,
              "Provide a concise summary of this webpage in 3-5 sentences. Focus on the main points and purpose of the page.",
            )
            const summaryText = userSearchData.candidates[0]?.content?.parts[0]?.text || '';
            summaryContent.innerHTML = summaryText
              // Convert newlines to HTML line breaks
              .replace(/\n/g, '<br>')
              // Escape any HTML that might be in the text except for our <br> tags
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/&lt;br&gt;/g, '<br>');
            summaryResult.classList.remove("hidden");
            showLoading(false)
          } catch (error) {
            showStatus("Error: " + error.message, "error")
            showLoading(false)
          }
        },
      )
    })
  })

  // Ask a question about the page


  function displayProducts(products) {
    // Clear previous results
    productsContainer.innerHTML = '';

    if (products.length === 0) {
      productsContainer.innerHTML = '<p class="text-gray-500">No matching products found.</p>';
      productResults.classList.remove('hidden');
      return;
    }

    // Create product cards
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card mb-3 p-3 border rounded bg-white';

      // HTML for the product card
      productCard.innerHTML = `
        <div class="flex items-start">
          ${product.imageUrl ?
          `<div class="mr-3">
              <img src="${product.imageUrl}" alt="${product.name}" class="w-16 h-16 object-cover rounded">
            </div>` : ''
        }
          <div class="flex-1">
            <h3 class="font-medium">${product.name}</h3>
            <p class="text-green-600 font-medium">\$${product.price}</p>
            <a href="${product.url}" target="_blank" class="text-blue-600 hover:underline text-sm">View Product</a>
          </div>
        </div>
      `;

      productsContainer.appendChild(productCard);
    });

    // Show the products section
    productResults.classList.remove('hidden');
  }


  // Function to scrape page content (executed in the context of the page)
  function scrapePageContent() {
    // Get the visible text content from the page
    function getVisibleText(element) {
      if (!element) return "";

      if (element.nodeType === Node.TEXT_NODE) {
        return element.textContent.trim();
      }

      if (element.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return "";
      }

      const tagName = element.tagName.toLowerCase();
      if (["script", "style", "noscript"].includes(tagName)) {
        return "";
      }

      let text = "";

      for (const child of element.childNodes) {
        text += getVisibleText(child);
      }

      if (
        ["block", "flex", "table", "list-item"].includes(style.display) ||
        ["p", "div", "li", "section", "header", "footer", "article", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tagName)
      ) {
        text += "\n";
      }

      return text;
    }

    // Get meta description
    let metaDescription = ""
    const metaDescEl = document.querySelector('meta[name="description"]')
    if (metaDescEl) {
      metaDescription = metaDescEl.getAttribute("content") || ""
    }

    // Get main content
    const mainContent = getVisibleText(document.body)

    // Get headings for structure
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((h) => `${h.tagName}: ${h.textContent.trim()}`)
      .join("\n")

    return {
      title: document.title,
      metaDescription,
      headings,
      mainContent: mainContent.substring(0, 15000), // Limit content length
    }
  }



  // Function to get response from Gemini API
  async function getGeminiResponse(pageContent, pageUrl, pageTitle, prompt) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(["geminiApiKey"], async (result) => {
        if (!result.geminiApiKey) {
          reject(new Error("API key not found. Please set your Gemini API key."))
          return
        }

        const apiKey = result.geminiApiKey
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

        // Format the content to send to Gemini
        const contentSummary = `
          URL: ${pageUrl}
          Title: ${pageTitle}
          Meta Description: ${pageContent?.metaDescription}
          
          Key Headings:
          ${pageContent?.headings}
          
          Page Content:
          ${pageContent?.mainContent}
        `

        // Prepare the request
        const requestData = {
          contents: [
            {
              parts: [
                {
                  text: `You are an AI assistant that helps users understand web content. 
                  Below is the content of a webpage. 
                  
                  ${contentSummary}
                  
                  User's request: ${prompt}
                  
                  Provide a helpful, accurate, and concise response on the product name and price based on the webpage content in 25 words.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
        }

        try {
          const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
          })
          userSearchData = await response.json();

          const response2 = await fetch('https://services.baxus.co/api/search/listings?from=0&size=20&listed=true');
          const listingsData = await response2.json();
          const requestData2 = {
            contents: [
              {
                parts: [
                  {
                    text: `Now understand the json response which contains the differect product names and price and other relevant details.
                    
                    JSON Data : ${JSON.stringify(listingsData, null, 2)}

                    Product Name and price that you have to search : ${JSON.stringify(userSearchData, null, 2)}
                    
                    User's request: Help me to find the product name and price from the above json response if any such product or similar products exists.
                    Also for the url of the product, append the product id to the base url https://www.baxus.co/asset/
                    
                   Return EXACTLY this JSON format with your findings:
{
  "products": [
    {
      "name": "The exact product name from the catalog",
      "price": "The exact price from the catalog with $ symbol",
      "url": "https://www.baxus.co/asset/product-id-here",
      "id": "The product ID"
    },
    ...more products if found
  ]
}
                    

                    
VERY IMPORTANT RULES:
- Match based on product name, type, category, brand, or price similarities
- Include at least 3 products if available, even if the match is not perfect
- Focus on finding the closest matches, not exact matches only
- If nothing seems to match at all, include the top 3 products from the catalog
- Do not make up information - use EXACTLY what's in the product catalog
- Return ONLY the JSON with no additional text
                    `,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 800,
            },
          }

          const response3 = await fetch(apiUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData2),
          })

          if (!response3.ok) {
            const errorData = await response.json()
            reject(new Error(`API Error: ${errorData.error?.message || "Unknown error"}`))
            return
          }

          const data = await response3.json()
          if (
            data.candidates &&
            data.candidates.length > 0 &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0
          ) {
            // resolve(data.candidates[0].content.parts[0].text)
            const responseText = data.candidates[0].content.parts[0].text
            try {
              // Extract JSON from the response text
              const jsonMatch = responseText.match(/({[\s\S]*})/);
              const jsonText = jsonMatch ? jsonMatch[0] : responseText;

              // Parse the JSON
              const productsData = JSON.parse(jsonText);

              // Display products
              displayProducts(productsData.products || []);

              // Return both the product info and general response
              const combinedResponse = `
  Product Information Detected:

  
  ${prompt === "Provide a concise summary of this webpage in 3-5 sentences. Focus on the main points and purpose of the page."
                  ? "Page Summary:"
                  : "Response to your question:"}
  ${responseText}`;

              resolve(combinedResponse);
            } catch (jsonError) {
              console.error("Error parsing product JSON:", jsonError);

              // Fallback: Try to extract products manually
              const fallbackProducts = extractProductsFromText(responseText);
              if (fallbackProducts.length > 0) {
                displayProducts(fallbackProducts);
              }

              // Still return the full response text
              resolve(responseText);
            }
          } else {
            reject(new Error("No valid response from Gemini API"))
          }
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  // Helper function to extract products from text when JSON parsing fails
  function extractProductsFromText(text) {
    const products = [];

    // Look for product name patterns
    const nameMatches = text.match(/["']name["']\s*:\s*["']([^"']+)["']/g);
    const priceMatches = text.match(/["']price["']\s*:\s*["']([^"']+)["']/g);
    const urlMatches = text.match(/["']url["']\s*:\s*["']([^"']+)["']/g);

    if (nameMatches && nameMatches.length > 0) {
      for (let i = 0; i < nameMatches.length; i++) {
        const name = nameMatches[i].match(/["']name["']\s*:\s*["']([^"']+)["']/)[1];
        const price = priceMatches && i < priceMatches.length ?
          priceMatches[i].match(/["']price["']\s*:\s*["']([^"']+)["']/)[1] :
          "Price not available";
        const url = urlMatches && i < urlMatches.length ?
          urlMatches[i].match(/["']url["']\s*:\s*["']([^"']+)["']/)[1] :
          "https://www.baxus.co/asset/";

        products.push({
          name: name,
          price: price,
          url: url
        });
      }
    }

    return products;
  }

  // Display products function remains similar but with a slight enhancement
  function displayProducts(products) {
    // Clear previous results
    productsContainer.innerHTML = '';

    if (!products || products.length === 0) {
      productsContainer.innerHTML = '<p style="color: #757575; text-align: center;">No matching products found.</p>';
      // productResults.classList.remove('hidden');
      productResults.style.display = 'block';
      return;
    }

    // Create product cards
    products.forEach(product => {
      const productCard = document.createElement('div');
      productCard.className = 'product-card';

      // HTML for the product card
      productCard.innerHTML = `
        <div class="product-container">
    <div class="product-content">
      <h3 class="product-name">${product.name || "Unknown Product"}</h3>
      <p class="product-price">${product.price || "Price not available"}</p>
      <a href="${product.url || "https://www.baxus.co/asset/"}" target="_blank" class="view-product-btn">
        View Product
      </a>
    </div>
  </div>
      `;

      productsContainer.appendChild(productCard);
    });

    // Show the products section
    // productResults.classList.remove('hidden');
    productResults.style.display = 'block';
  }

  // Helper function to show status messages
  function showStatus(message, type = "info") {
    statusMessage.textContent = message
    statusMessage.className = "text-sm text-center mt-2"

    if (type === "error") {
      statusMessage.classList.add("text-red-600")
    } else if (type === "success") {
      statusMessage.classList.add("text-green-600")
    } else {
      statusMessage.classList.add("text-gray-600")
    }

    // Clear message after 5 seconds
    setTimeout(() => {
      statusMessage.textContent = ""
    }, 5000)
  }

  // Helper function to show/hide loading indicator
  function showLoading(show) {
    if (show) {
      loadingIndicator.classList.remove("hidden")
    } else {
      loadingIndicator.classList.add("hidden")
    }
  }
})
