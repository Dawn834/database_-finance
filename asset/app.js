const socket = io();
let isConnected = false;

// Connection status handling
socket.on('connect', function () {
    console.log('[INFO] Connected to server');
    isConnected = true;
    updateStatus('Đã kết nối - Đang chờ dữ liệu...', 'connected');
});

socket.on('disconnect', function () {
    console.log('[INFO] Disconnected from server');
    isConnected = false;
    updateStatus('Mất kết nối - Đang thử kết nối lại...', 'disconnected');
});

function updateStatus(message, className) {
    const statusDiv = document.getElementById('status');
    statusDiv.textContent = message;
    statusDiv.className = `status ${className}`;
}

// Stock data handling
socket.on("stock_data", function (data) {
    console.log("[DEBUG] Received stock data:", data);

    const tbody = document.querySelector("#stockTable tbody");
    const loadingDiv = document.getElementById("loading");
    const stockTable = document.getElementById("stockTable");

    // Hide loading and show table
    loadingDiv.style.display = "none";
    stockTable.style.display = "table";
    updateStatus(`Cập nhật lúc: ${new Date().toLocaleTimeString('vi-VN')}`, 'connected');

    // Clear old rows
    tbody.innerHTML = "";

    // Check if data is valid
    if (!Array.isArray(data) || data.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 3;
        cell.textContent = "Không có dữ liệu";
        cell.style.textAlign = "center";
        cell.style.color = "#666";
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

    data.forEach(stock => {
        const row = document.createElement("tr");

        // Symbol cell
        const symbolCell = document.createElement("td");
        symbolCell.className = "symbol-cell";
        symbolCell.textContent = stock.symbol || "N/A";

        // Price cell with proper formatting
        const priceCell = document.createElement("td");
        priceCell.className = "price-cell";

        let numericPrice = parseFloat(stock.price);
        if (isNaN(numericPrice) || numericPrice === null || numericPrice === undefined) {
            priceCell.textContent = "N/A";
        } else {
            // Format price with comma separator and 2 decimal places
            const formattedPrice = numericPrice.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            priceCell.textContent = `US$ ${formattedPrice}`;
        }

        // Change cell
        const changeCell = document.createElement("td");
        let numericChange = parseFloat(stock.change);

        if (isNaN(numericChange) || numericChange === null || numericChange === undefined) {
            changeCell.textContent = "N/A";
            changeCell.className = "neutral";
        } else {
            changeCell.textContent = numericChange.toFixed(2) + "%";

            if (numericChange > 0) {
                changeCell.className = "up";
                changeCell.textContent = "+" + changeCell.textContent;
            } else if (numericChange < 0) {
                changeCell.className = "down";
            } else {
                changeCell.className = "neutral";
            }
        }

        // Add cells to row
        row.appendChild(symbolCell);
        row.appendChild(priceCell);
        row.appendChild(changeCell);
        tbody.appendChild(row);
    });
});

// Error handling
socket.on('connect_error', function (error) {
    console.error('[ERROR] Connection failed:', error);
    updateStatus('Lỗi kết nối - Vui lòng thử lại', 'disconnected');
});

// Retry connection every 5 seconds if disconnected
setInterval(function () {
    if (!isConnected && !socket.connected) {
        console.log('[INFO] Attempting to reconnect...');
        socket.connect();
    }
}, 5000);