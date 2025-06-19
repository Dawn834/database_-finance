import time
import requests
from flask_socketio import SocketIO
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# API Keys
API_KEY = "d0dn41hr01qv1dmii2bgd0dn41hr01qv1dmii2c0"
NEWS_API_KEY = "071e2a569c784e639f72de8f095d702c"

STOCK_SYMBOLS = ["AAPL", "GOOGL", "MSFT", "NVDA", "TSLA"]
INDEX_SYMBOLS = ["^GSPC", "^IXIC", "^DJI"]  # S&P 500, NASDAQ, Dow Jones

# Mapping cho tên hiển thị
INDEX_NAMES = {
    "^GSPC": "S&P 500",
    "^IXIC": "NASDAQ",
    "^DJI": "Dow Jones"
}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/news")
def news_page():
    return render_template("news.html")

@app.route("/api/news")
def get_all_news():
    """API endpoint để lấy tin tức cho tất cả cổ phiếu"""
    result = {}
    print("[INFO] Fetching news for all stocks...")
    
    for symbol in STOCK_SYMBOLS:
        print(f"[INFO] Getting news for {symbol}...")
        articles = get_news_for_stock(symbol)
        result[symbol] = articles
        print(f"[INFO] Found {len(articles)} articles for {symbol}")
    
    print(f"[INFO] Total news data: {result}")
    return jsonify(result)

def get_news_for_stock(symbol, max_articles=3):
    """Lấy tin tức cho một cổ phiếu cụ thể"""
    # Tạo query search tốt hơn
    company_names = {
        "AAPL": "Apple",
        "GOOGL": "Google Alphabet",
        "MSFT": "Microsoft",
        "NVDA": "NVIDIA",
        "TSLA": "Tesla"
    }
    
    search_term = company_names.get(symbol, symbol)
    url = f"https://newsapi.org/v2/everything"
    
    params = {
        'q': f'"{search_term}" OR "{symbol}"',
        'language': 'en',
        'sortBy': 'publishedAt',
        'pageSize': max_articles,
        'apiKey': NEWS_API_KEY,
        'domains': 'reuters.com,bloomberg.com,cnbc.com,marketwatch.com,yahoo.com'  # Chỉ lấy từ các nguồn uy tín
    }
    
    try:
        print(f"[DEBUG] News API request for {symbol}: {url} with params: {params}")
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        print(f"[DEBUG] News API response for {symbol}: status={data.get('status')}, totalResults={data.get('totalResults', 0)}")
        
        if data.get('status') == 'ok':
            articles = data.get('articles', [])[:max_articles]
            # Filter out articles with missing essential data
            filtered_articles = []
            for article in articles:
                if article.get('title') and article.get('url'):
                    filtered_articles.append({
                        'title': article.get('title', ''),
                        'description': article.get('description', ''),
                        'url': article.get('url', ''),
                        'publishedAt': article.get('publishedAt', ''),
                        'source': article.get('source', {}).get('name', 'Unknown')
                    })
            return filtered_articles
        else:
            print(f"[WARNING] News API error for {symbol}: {data.get('message', 'Unknown error')}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] News fetch request error for {symbol}: {e}")
        return []
    except Exception as e:
        print(f"[ERROR] News fetch unexpected error for {symbol}: {e}")
        return []

def get_stock_data(symbols, data_type="stock"):
    """Lấy dữ liệu cổ phiếu hoặc chỉ số"""
    result_data = []
    
    for symbol in symbols:
        url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={API_KEY}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            print(f"[DEBUG] API response for {symbol}: {data}")
            
            if "c" in data and "pc" in data and data["c"] is not None:
                current_price = float(data["c"])
                previous_close = float(data["pc"])
                
                if previous_close != 0:
                    change_percent = ((current_price - previous_close) / previous_close) * 100
                else:
                    change_percent = 0.0
                
                # Xác định tên hiển thị
                display_name = symbol
                if data_type == "index" and symbol in INDEX_NAMES:
                    display_name = INDEX_NAMES[symbol]
                
                info = {
                    "symbol": symbol,
                    "name": display_name,
                    "price": round(current_price, 2),
                    "change": round(change_percent, 2),
                    "type": data_type
                }
                
                result_data.append(info)
                print(f"[INFO] Added {data_type} data for {symbol}: {info}")
                
            else:
                print(f"[WARNING] Invalid or missing data for {symbol}: {data}")
                
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Request failed for {symbol}: {e}")
        except (ValueError, TypeError) as e:
            print(f"[ERROR] Data parsing error for {symbol}: {e}")
        except Exception as e:
            print(f"[ERROR] Unexpected error for {symbol}: {e}")
    
    return result_data

def emit_stock_data():
    while True:
        # Lấy dữ liệu cổ phiếu
        stock_data = get_stock_data(STOCK_SYMBOLS, "stock")
        
        # Lấy dữ liệu chỉ số
        index_data = get_stock_data(INDEX_SYMBOLS, "index")
        
        # Gửi dữ liệu riêng biệt
        if stock_data:
            print(f"[INFO] Emitting stock_data to clients: {stock_data}")
            socketio.emit("stock_data", stock_data)
        
        if index_data:
            print(f"[INFO] Emitting index_data to clients: {index_data}")
            socketio.emit("index_data", index_data)
        
        if not stock_data and not index_data:
            print("[WARNING] No valid data to emit")
        
        time.sleep(6)

@socketio.on('connect')
def handle_connect():
    print('[INFO] Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('[INFO] Client disconnected')

if __name__ == "__main__":
    print("[INFO] Starting Flask-SocketIO server...")
    print(f"[INFO] Tracking stocks: {STOCK_SYMBOLS}")
    print(f"[INFO] Tracking indices: {INDEX_SYMBOLS}")
    
    # Start background task
    socketio.start_background_task(emit_stock_data)
    
    # Run the app
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)