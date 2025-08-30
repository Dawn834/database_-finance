
let isLoading = false;

async function fetchNews() {
    if (isLoading) return;

    const container = document.getElementById('news-container');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const success = document.getElementById('success');

    try {
        isLoading = true;

        // Show loading state
        loading.style.display = 'block';
        error.style.display = 'none';
        success.style.display = 'none';
        container.innerHTML = '';

        console.log('[INFO] Fetching news data...');
        const res = await fetch('/api/news');

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        console.log('[INFO] News data received:', data);

        // Hide loading
        loading.style.display = 'none';
        success.style.display = 'block';

        // Hide success message after 3 seconds
        setTimeout(() => {
            success.style.display = 'none';
        }, 3000);

        let hasNews = false;

        for (const [symbol, articles] of Object.entries(data)) {
            if (!articles || !Array.isArray(articles) || articles.length === 0) {
                console.log(`[INFO] No articles for ${symbol}`);
                continue;
            }

            hasNews = true;
            const group = document.createElement('div');
            group.className = 'symbol-group';

            const header = document.createElement('h2');
            header.innerHTML = `
            <span class="symbol-badge">${symbol}</span>
            <span>${getCompanyName(symbol)}</span>
          `;
            group.appendChild(header);

            const articlesContainer = document.createElement('div');
            articlesContainer.className = 'articles-grid';

            articles.forEach((article, index) => {
                const articleDiv = document.createElement('div');
                articleDiv.className = 'article';
                articleDiv.style.animationDelay = `${index * 0.1}s`;

                const title = article.title || 'Tiêu đề không có sẵn';
                const description = article.description || 'Mô tả không có sẵn';
                const url = article.url || '#';
                const publishedAt = article.publishedAt ? new Date(article.publishedAt).toLocaleString('vi-VN') : 'Thời gian không xác định';
                const source = article.source || 'Nguồn không xác định';

                articleDiv.innerHTML = `
              <a href="${url}" target="_blank" class="article-title" rel="noopener noreferrer">
                ${title}
              </a>
              <p class="article-description">${description}</p>
              <div class="article-meta">
                <span class="article-source">${source}</span>
                <small>${publishedAt}</small>
              </div>
            `;

                articlesContainer.appendChild(articleDiv);
            });

            group.appendChild(articlesContainer);
            container.appendChild(group);
        }

        if (!hasNews) {
            container.innerHTML = '<div class="no-news">📰 Không có tin tức nào để hiển thị.</div>';
        }

    } catch (e) {
        console.error('[ERROR] Failed to fetch news:', e);
        loading.style.display = 'none';
        error.style.display = 'block';
        success.style.display = 'none';

        container.innerHTML = `
          <div class="no-news">
            ❌ Lỗi khi tải tin tức: ${e.message}<br>
            <button onclick="fetchNews()" style="margin-top: 10px; padding: 8px 16px; border: none; border-radius: 5px; background: #667eea; color: white; cursor: pointer;">
              Thử lại
            </button>
          </div>
        `;
    } finally {
        isLoading = false;
    }
}

function getCompanyName(symbol) {
    const names = {
        'AAPL': 'Apple Inc.',
        'GOOGL': 'Alphabet Inc.',
        'MSFT': 'Microsoft Corporation',
        'NVDA': 'NVIDIA Corporation',
        'TSLA': 'Tesla Inc.'
    };
    return names[symbol] || symbol;
}

// Load news when page loads
document.addEventListener('DOMContentLoaded', fetchNews);

// Auto refresh every 5 minutes
setInterval(fetchNews, 5 * 60 * 1000);
