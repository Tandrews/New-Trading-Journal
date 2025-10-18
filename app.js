// Trading Journal v3.0 - Complete JavaScript Implementation

// Global Variables
let db;
let allTrades = [];
let portfolioSettings = { startingCapital: 10000, currentBalance: 10000 };
let currentSortColumn = '';
let currentSortDirection = 'asc';
let chartInstances = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Initializing Trading Journal v3.0...');
    
    try {
        await initDB();
        await loadPortfolioSettings();
        await loadTrades();
        setupEventListeners();
        updateDashboard();
        updateFilters();
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showMessage('Failed to initialize application. Please refresh the page.', 'error');
    }
});

// IndexedDB Setup
async function initDB() {
    try {
        db = await idb.openDB('TradingJournalDB', 3, {
            upgrade(db, oldVersion, newVersion, transaction) {
                console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
                
                // Create trades store
                if (!db.objectStoreNames.contains('trades')) {
                    const tradesStore = db.createObjectStore('trades', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    tradesStore.createIndex('date', 'date');
                    tradesStore.createIndex('ticker', 'ticker');
                    tradesStore.createIndex('strategy', 'strategy');
                }
                
                // Create portfolio settings store
                if (!db.objectStoreNames.contains('portfolioSettings')) {
                    db.createObjectStore('portfolioSettings', { keyPath: 'id' });
                }
                
                // Create portfolio history store
                if (!db.objectStoreNames.contains('portfolioHistory')) {
                    const historyStore = db.createObjectStore('portfolioHistory', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    historyStore.createIndex('date', 'date');
                }
            }
        });
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
}

// Portfolio Management
async function loadPortfolioSettings() {
    try {
        const settings = await db.get('portfolioSettings', 'main');
        if (settings) {
            portfolioSettings = settings;
        } else {
            // Save default settings
            await db.put('portfolioSettings', { id: 'main', ...portfolioSettings });
        }
    } catch (error) {
        console.error('Failed to load portfolio settings:', error);
    }
}

async function savePortfolioSettings() {
    try {
        await db.put('portfolioSettings', { id: 'main', ...portfolioSettings });
        await savePortfolioHistory();
    } catch (error) {
        console.error('Failed to save portfolio settings:', error);
    }
}

async function savePortfolioHistory() {
    try {
        await db.add('portfolioHistory', {
            date: new Date().toISOString(),
            balance: portfolioSettings.currentBalance,
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Failed to save portfolio history:', error);
    }
}

// Trade Management
async function loadTrades() {
    try {
        allTrades = await db.getAll('trades');
        allTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log(`Loaded ${allTrades.length} trades`);
        displayTrades();
    } catch (error) {
        console.error('Failed to load trades:', error);
        allTrades = [];
    }
}

async function addTrade(tradeData) {
    try {
        const trade = {
            ...tradeData,
            id: undefined, // Let IndexedDB auto-generate
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const id = await db.add('trades', trade);
        trade.id = id;
        allTrades.unshift(trade);
        
        // Update portfolio balance
        portfolioSettings.currentBalance += parseFloat(tradeData.net_pl) || 0;
        await savePortfolioSettings();
        
        console.log('Trade added successfully:', trade);
        return trade;
    } catch (error) {
        console.error('Failed to add trade:', error);
        throw error;
    }
}

async function updateTrade(tradeData) {
    try {
        const existingTrade = allTrades.find(t => t.id === tradeData.id);
        if (!existingTrade) {
            throw new Error('Trade not found');
        }
        
        // Update portfolio balance (remove old P&L, add new P&L)
        const oldPL = parseFloat(existingTrade.net_pl) || 0;
        const newPL = parseFloat(tradeData.net_pl) || 0;
        portfolioSettings.currentBalance = portfolioSettings.currentBalance - oldPL + newPL;
        
        const updatedTrade = {
            ...tradeData,
            updated_at: new Date().toISOString(),
            created_at: existingTrade.created_at
        };
        
        await db.put('trades', updatedTrade);
        await savePortfolioSettings();
        
        const index = allTrades.findIndex(t => t.id === tradeData.id);
        if (index !== -1) {
            allTrades[index] = updatedTrade;
        }
        
        console.log('Trade updated successfully:', updatedTrade);
        return updatedTrade;
    } catch (error) {
        console.error('Failed to update trade:', error);
        throw error;
    }
}

async function deleteTrade(tradeId) {
    try {
        const trade = allTrades.find(t => t.id === tradeId);
        if (!trade) {
            throw new Error('Trade not found');
        }
        
        // Update portfolio balance
        portfolioSettings.currentBalance -= parseFloat(trade.net_pl) || 0;
        
        await db.delete('trades', tradeId);
        await savePortfolioSettings();
        
        allTrades = allTrades.filter(t => t.id !== tradeId);
        
        console.log('Trade deleted successfully');
    } catch (error) {
        console.error('Failed to delete trade:', error);
        throw error;
    }
}

// Event Listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Add trade form
    document.getElementById('addTradeForm').addEventListener('submit', handleAddTrade);
    
    // Edit trade form
    document.getElementById('editTradeForm').addEventListener('submit', handleEditTrade);
    
    // Portfolio form
    document.getElementById('portfolioForm').addEventListener('submit', handlePortfolioUpdate);
    
    // Portfolio settings modal
    document.getElementById('portfolioSettingsBtn').addEventListener('click', openPortfolioModal);
    document.getElementById('closePortfolioModal').addEventListener('click', closePortfolioModal);
    
    // Edit trade modal
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    
    // View trade modal
    document.getElementById('closeViewModal').addEventListener('click', closeViewModal);
    
    // Import/Export
    document.getElementById('previewCsvBtn').addEventListener('click', previewCSV);
    document.getElementById('importCsvBtn').addEventListener('click', importCSV);
    document.getElementById('exportCsvBtn').addEventListener('click', exportToCSV);
    
    // Filters
    document.getElementById('tickerFilter').addEventListener('change', applyFilters);
    document.getElementById('strategyFilter').addEventListener('change', applyFilters);
    document.getElementById('fromDate').addEventListener('change', applyFilters);
    document.getElementById('toDate').addEventListener('change', applyFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    // Modal backgrounds
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
    
    // Set default date to today
    document.getElementById('tradeDate').valueAsDate = new Date();
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    
    // Load specific tab data
    if (tabName === 'analytics') {
        updateAnalyticsCharts();
    } else if (tabName === 'dashboard') {
        updateDashboard();
    }
}

// Trade Form Handlers
async function handleAddTrade(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(e.target);
        const tradeData = {
            date: document.getElementById('tradeDate').value,
            ticker: document.getElementById('ticker').value.toUpperCase(),
            strategy: document.getElementById('strategy').value,
            option_type: document.getElementById('optionType').value,
            strike: parseFloat(document.getElementById('strike').value) || null,
            expiration: document.getElementById('expiration').value || null,
            quantity: parseInt(document.getElementById('quantity').value),
            entry_price: parseFloat(document.getElementById('entryPrice').value),
            exit_price: parseFloat(document.getElementById('exitPrice').value) || null,
            premium: parseFloat(document.getElementById('premium').value),
            fees: parseFloat(document.getElementById('fees').value) || 0,
            net_pl: parseFloat(document.getElementById('netPL').value),
            outcome: document.getElementById('outcome').value,
            delta: parseFloat(document.getElementById('delta').value) || null,
            gamma: parseFloat(document.getElementById('gamma').value) || null,
            theta: parseFloat(document.getElementById('theta').value) || null,
            vega: parseFloat(document.getElementById('vega').value) || null,
            trade_notes: document.getElementById('tradeNotes').value || '',
            post_trade_analysis: document.getElementById('postTradeAnalysis').value || ''
        };
        
        await addTrade(tradeData);
        e.target.reset();
        document.getElementById('tradeDate').valueAsDate = new Date();
        
        displayTrades();
        updateDashboard();
        updateFilters();
        
        showMessage('Trade added successfully!', 'success');
    } catch (error) {
        console.error('Failed to add trade:', error);
        showMessage('Failed to add trade. Please try again.', 'error');
    }
}

async function handleEditTrade(e) {
    e.preventDefault();
    
    try {
        const tradeData = {
            id: parseInt(document.getElementById('editTradeId').value),
            date: document.getElementById('editTradeDate').value,
            ticker: document.getElementById('editTicker').value.toUpperCase(),
            strategy: document.getElementById('editStrategy').value,
            option_type: document.getElementById('editOptionType').value,
            strike: parseFloat(document.getElementById('editStrike').value) || null,
            expiration: document.getElementById('editExpiration').value || null,
            quantity: parseInt(document.getElementById('editQuantity').value),
            entry_price: parseFloat(document.getElementById('editEntryPrice').value),
            exit_price: parseFloat(document.getElementById('editExitPrice').value) || null,
            premium: parseFloat(document.getElementById('editPremium').value),
            fees: parseFloat(document.getElementById('editFees').value) || 0,
            net_pl: parseFloat(document.getElementById('editNetPL').value),
            outcome: document.getElementById('editOutcome').value,
            delta: parseFloat(document.getElementById('editDelta').value) || null,
            gamma: parseFloat(document.getElementById('editGamma').value) || null,
            theta: parseFloat(document.getElementById('editTheta').value) || null,
            vega: parseFloat(document.getElementById('editVega').value) || null,
            trade_notes: document.getElementById('editTradeNotes').value || '',
            post_trade_analysis: document.getElementById('editPostTradeAnalysis').value || ''
        };
        
        await updateTrade(tradeData);
        closeEditModal();
        
        displayTrades();
        updateDashboard();
        
        showMessage('Trade updated successfully!', 'success');
    } catch (error) {
        console.error('Failed to update trade:', error);
        showMessage('Failed to update trade. Please try again.', 'error');
    }
}

async function handlePortfolioUpdate(e) {
    e.preventDefault();
    
    try {
        portfolioSettings.startingCapital = parseFloat(document.getElementById('startingCapital').value);
        portfolioSettings.currentBalance = parseFloat(document.getElementById('currentBalance').value);
        
        await savePortfolioSettings();
        closePortfolioModal();
        updateDashboard();
        
        showMessage('Portfolio settings updated successfully!', 'success');
    } catch (error) {
        console.error('Failed to update portfolio settings:', error);
        showMessage('Failed to update portfolio settings. Please try again.', 'error');
    }
}

// Modal Management
function openPortfolioModal() {
    document.getElementById('startingCapital').value = portfolioSettings.startingCapital;
    document.getElementById('currentBalance').value = portfolioSettings.currentBalance;
    document.getElementById('portfolioModal').classList.add('active');
}

function closePortfolioModal() {
    document.getElementById('portfolioModal').classList.remove('active');
}

function openEditModal(tradeId) {
    const trade = allTrades.find(t => t.id === tradeId);
    if (!trade) return;
    
    document.getElementById('editTradeId').value = trade.id;
    document.getElementById('editTradeDate').value = trade.date;
    document.getElementById('editTicker').value = trade.ticker;
    document.getElementById('editStrategy').value = trade.strategy;
    document.getElementById('editOptionType').value = trade.option_type;
    document.getElementById('editStrike').value = trade.strike || '';
    document.getElementById('editExpiration').value = trade.expiration || '';
    document.getElementById('editQuantity').value = trade.quantity;
    document.getElementById('editEntryPrice').value = trade.entry_price;
    document.getElementById('editExitPrice').value = trade.exit_price || '';
    document.getElementById('editPremium').value = trade.premium;
    document.getElementById('editFees').value = trade.fees || 0;
    document.getElementById('editNetPL').value = trade.net_pl;
    document.getElementById('editOutcome').value = trade.outcome;
    document.getElementById('editDelta').value = trade.delta || '';
    document.getElementById('editGamma').value = trade.gamma || '';
    document.getElementById('editTheta').value = trade.theta || '';
    document.getElementById('editVega').value = trade.vega || '';
    document.getElementById('editTradeNotes').value = trade.trade_notes || '';
    document.getElementById('editPostTradeAnalysis').value = trade.post_trade_analysis || '';
    
    document.getElementById('editTradeModal').classList.add('active');
}

function closeEditModal() {
    document.getElementById('editTradeModal').classList.remove('active');
}

function openViewModal(tradeId) {
    const trade = allTrades.find(t => t.id === tradeId);
    if (!trade) return;
    
    const detailsContainer = document.getElementById('viewTradeDetails');
    detailsContainer.innerHTML = `
        <div class="trade-detail-section">
            <h4>Basic Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div class="detail-value">${formatDate(trade.date)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Ticker</div>
                    <div class="detail-value">${trade.ticker}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Strategy</div>
                    <div class="detail-value">${trade.strategy}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Option Type</div>
                    <div class="detail-value">${trade.option_type}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Strike Price</div>
                    <div class="detail-value">$${trade.strike || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Expiration</div>
                    <div class="detail-value">${trade.expiration ? formatDate(trade.expiration) : 'N/A'}</div>
                </div>
            </div>
        </div>
        
        <div class="trade-detail-section">
            <h4>Trade Details</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Quantity</div>
                    <div class="detail-value">${trade.quantity}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Entry Price</div>
                    <div class="detail-value">$${trade.entry_price}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Exit Price</div>
                    <div class="detail-value">$${trade.exit_price || 'Open'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Premium</div>
                    <div class="detail-value">$${trade.premium}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Fees</div>
                    <div class="detail-value">$${trade.fees || 0}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Net P&L</div>
                    <div class="detail-value ${trade.net_pl >= 0 ? 'pl-positive' : 'pl-negative'}">$${trade.net_pl}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Outcome</div>
                    <div class="detail-value">
                        <span class="outcome-${trade.outcome.toLowerCase()}">${trade.outcome}</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="trade-detail-section">
            <h4>Greeks</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Delta</div>
                    <div class="detail-value">${trade.delta || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Gamma</div>
                    <div class="detail-value">${trade.gamma || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Theta</div>
                    <div class="detail-value">${trade.theta || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Vega</div>
                    <div class="detail-value">${trade.vega || 'N/A'}</div>
                </div>
            </div>
        </div>
        
        ${trade.trade_notes ? `
            <div class="trade-detail-section">
                <h4>Trade Notes</h4>
                <div class="detail-value">${trade.trade_notes}</div>
            </div>
        ` : ''}
        
        ${trade.post_trade_analysis ? `
            <div class="trade-detail-section">
                <h4>Post-Trade Analysis</h4>
                <div class="detail-value">${trade.post_trade_analysis}</div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('viewTradeModal').classList.add('active');
}

function closeViewModal() {
    document.getElementById('viewTradeModal').classList.remove('active');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// Trade Display and Sorting
function displayTrades(trades = null) {
    const tradesToDisplay = trades || getFilteredTrades();
    const tbody = document.getElementById('tradesTableBody');
    
    if (tradesToDisplay.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No trades found</td></tr>';
        return;
    }
    
    tbody.innerHTML = tradesToDisplay.map(trade => `
        <tr>
            <td>${formatDate(trade.date)}</td>
            <td>${trade.ticker}</td>
            <td>${trade.strategy}</td>
            <td>$${trade.strike || 'N/A'}</td>
            <td>${trade.quantity}</td>
            <td>$${trade.premium}</td>
            <td class="${trade.net_pl >= 0 ? 'pl-positive' : 'pl-negative'}">$${trade.net_pl}</td>
            <td><span class="outcome-${trade.outcome.toLowerCase()}">${trade.outcome}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn--sm btn--secondary" onclick="openViewModal(${trade.id})">View</button>
                    <button class="btn btn--sm btn--secondary" onclick="openEditModal(${trade.id})">Edit</button>
                    <button class="btn btn--sm btn--danger" onclick="confirmDeleteTrade(${trade.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function sortTradesByColumn(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    
    const filteredTrades = getFilteredTrades();
    
    filteredTrades.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];
        
        // Handle different data types
        if (column === 'date') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        } else if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        } else if (typeof aVal === 'number') {
            aVal = parseFloat(aVal) || 0;
            bVal = parseFloat(bVal) || 0;
        }
        
        if (currentSortDirection === 'asc') {
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
    });
    
    displayTrades(filteredTrades);
    updateSortIndicators();
}

function updateSortIndicators() {
    document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.className = 'sort-indicator';
    });
    
    const currentHeader = document.querySelector(`[data-sort="${currentSortColumn}"] .sort-indicator`);
    if (currentHeader) {
        currentHeader.classList.add(currentSortDirection);
    }
}

async function confirmDeleteTrade(tradeId) {
    if (confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
        try {
            await deleteTrade(tradeId);
            displayTrades();
            updateDashboard();
            updateFilters();
            showMessage('Trade deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete trade:', error);
            showMessage('Failed to delete trade. Please try again.', 'error');
        }
    }
}

// Filters
function getFilteredTrades() {
    const tickerFilter = document.getElementById('tickerFilter').value;
    const strategyFilter = document.getElementById('strategyFilter').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;
    
    return allTrades.filter(trade => {
        if (tickerFilter && trade.ticker !== tickerFilter) return false;
        if (strategyFilter && trade.strategy !== strategyFilter) return false;
        if (fromDate && trade.date < fromDate) return false;
        if (toDate && trade.date > toDate) return false;
        return true;
    });
}

function applyFilters() {
    displayTrades();
}

function clearFilters() {
    document.getElementById('tickerFilter').value = '';
    document.getElementById('strategyFilter').value = '';
    document.getElementById('fromDate').value = '';
    document.getElementById('toDate').value = '';
    displayTrades();
}

function updateFilters() {
    // Update ticker filter
    const tickers = [...new Set(allTrades.map(t => t.ticker))].sort();
    const tickerFilter = document.getElementById('tickerFilter');
    const currentTicker = tickerFilter.value;
    
    tickerFilter.innerHTML = '<option value="">All Tickers</option>';
    tickers.forEach(ticker => {
        const option = document.createElement('option');
        option.value = ticker;
        option.textContent = ticker;
        if (ticker === currentTicker) option.selected = true;
        tickerFilter.appendChild(option);
    });
    
    // Update strategy filter
    const strategies = [...new Set(allTrades.map(t => t.strategy))].sort();
    const strategyFilter = document.getElementById('strategyFilter');
    const currentStrategy = strategyFilter.value;
    
    strategyFilter.innerHTML = '<option value="">All Strategies</option>';
    strategies.forEach(strategy => {
        const option = document.createElement('option');
        option.value = strategy;
        option.textContent = strategy;
        if (strategy === currentStrategy) option.selected = true;
        strategyFilter.appendChild(option);
    });
}

// Dashboard and Metrics
function updateDashboard() {
    const metrics = calculateMetrics();
    const riskMetrics = calculateRiskMetrics();
    
    // Update metric cards
    document.getElementById('totalPL').textContent = formatCurrency(metrics.totalPL);
    document.getElementById('totalPL').className = `metric-value ${metrics.totalPL >= 0 ? 'positive' : 'negative'}`;
    
    document.getElementById('winRate').textContent = `${metrics.winRate.toFixed(1)}%`;
    document.getElementById('totalTrades').textContent = metrics.totalTrades;
    document.getElementById('avgWin').textContent = formatCurrency(metrics.avgWin);
    document.getElementById('avgLoss').textContent = formatCurrency(metrics.avgLoss);
    document.getElementById('profitFactor').textContent = metrics.profitFactor.toFixed(2);
    document.getElementById('portfolioBalance').textContent = formatCurrency(portfolioSettings.currentBalance);
    
    // Risk metrics
    document.getElementById('maxDrawdown').textContent = `${riskMetrics.maxDrawdown.toFixed(2)}%`;
    document.getElementById('sharpeRatio').textContent = riskMetrics.sharpeRatio.toFixed(2);
    document.getElementById('currentStreak').textContent = riskMetrics.currentStreak;
    document.getElementById('currentStreak').className = `metric-value ${riskMetrics.currentStreak >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('maxWins').textContent = riskMetrics.maxConsecutiveWins;
    document.getElementById('maxLosses').textContent = riskMetrics.maxConsecutiveLosses;
    
    // Update charts
    updateCharts();
}

function calculateMetrics() {
    if (allTrades.length === 0) {
        return {
            totalPL: 0,
            winRate: 0,
            totalTrades: 0,
            avgWin: 0,
            avgLoss: 0,
            profitFactor: 0
        };
    }
    
    const totalPL = allTrades.reduce((sum, trade) => sum + (parseFloat(trade.net_pl) || 0), 0);
    const wins = allTrades.filter(t => t.outcome === 'Win');
    const losses = allTrades.filter(t => t.outcome === 'Loss');
    
    const winRate = allTrades.length > 0 ? (wins.length / allTrades.length) * 100 : 0;
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (parseFloat(t.net_pl) || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (parseFloat(t.net_pl) || 0), 0) / losses.length) : 0;
    
    const grossWins = wins.reduce((sum, t) => sum + (parseFloat(t.net_pl) || 0), 0);
    const grossLosses = Math.abs(losses.reduce((sum, t) => sum + (parseFloat(t.net_pl) || 0), 0));
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 999 : 0;
    
    return {
        totalPL,
        winRate,
        totalTrades: allTrades.length,
        avgWin,
        avgLoss,
        profitFactor
    };
}

function calculateRiskMetrics() {
    if (allTrades.length === 0) {
        return {
            maxDrawdown: 0,
            sharpeRatio: 0,
            currentStreak: 0,
            maxConsecutiveWins: 0,
            maxConsecutiveLosses: 0
        };
    }
    
    // Sort trades by date for chronological analysis
    const chronologicalTrades = [...allTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate drawdown
    let runningBalance = portfolioSettings.startingCapital;
    let peak = runningBalance;
    let maxDrawdown = 0;
    
    chronologicalTrades.forEach(trade => {
        runningBalance += parseFloat(trade.net_pl) || 0;
        if (runningBalance > peak) {
            peak = runningBalance;
        }
        const drawdown = ((peak - runningBalance) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
    });
    
    // Calculate Sharpe Ratio (simplified)
    const returns = chronologicalTrades.map(t => parseFloat(t.net_pl) || 0);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized
    
    // Calculate streaks
    let currentStreak = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let tempWinStreak = 0;
    let tempLossStreak = 0;
    
    chronologicalTrades.forEach(trade => {
        if (trade.outcome === 'Win') {
            tempWinStreak++;
            tempLossStreak = 0;
            maxConsecutiveWins = Math.max(maxConsecutiveWins, tempWinStreak);
        } else if (trade.outcome === 'Loss') {
            tempLossStreak++;
            tempWinStreak = 0;
            maxConsecutiveLosses = Math.max(maxConsecutiveLosses, tempLossStreak);
        }
    });
    
    // Current streak (most recent trades)
    if (chronologicalTrades.length > 0) {
        const lastTrade = chronologicalTrades[chronologicalTrades.length - 1];
        if (lastTrade.outcome === 'Win') {
            currentStreak = tempWinStreak;
        } else if (lastTrade.outcome === 'Loss') {
            currentStreak = -tempLossStreak;
        }
    }
    
    return {
        maxDrawdown,
        sharpeRatio,
        currentStreak,
        maxConsecutiveWins,
        maxConsecutiveLosses
    };
}

function calculateTimeBasedMetrics() {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const hourData = Array(24).fill(null).map(() => ({ wins: 0, total: 0 }));
    const dayData = Array(7).fill(null).map(() => ({ wins: 0, total: 0, pl: 0 }));
    
    allTrades.forEach(trade => {
        const date = new Date(trade.date);
        const hour = date.getHours();
        const dayOfWeek = date.getDay();
        const pl = parseFloat(trade.net_pl) || 0;
        
        // Hour data
        hourData[hour].total++;
        if (trade.outcome === 'Win') hourData[hour].wins++;
        
        // Day data
        dayData[dayOfWeek].total++;
        dayData[dayOfWeek].pl += pl;
        if (trade.outcome === 'Win') dayData[dayOfWeek].wins++;
    });
    
    return { hourData, dayData, dayNames };
}

// Chart Management
function updateCharts() {
    updatePLChart();
    updatePortfolioChart();
    updateStrategyChart();
    updateTickerChart();
    updateMonthlyChart();
}

function updatePLChart() {
    const ctx = document.getElementById('plChart').getContext('2d');
    
    if (chartInstances.plChart) {
        chartInstances.plChart.destroy();
    }
    
    const chronologicalTrades = [...allTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cumulativePL = 0;
    
    const data = chronologicalTrades.map(trade => {
        cumulativePL += parseFloat(trade.net_pl) || 0;
        return {
            x: trade.date,
            y: cumulativePL
        };
    });
    
    chartInstances.plChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Cumulative P&L',
                data: data,
                borderColor: '#4dabf7',
                backgroundColor: 'rgba(77, 171, 247, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updatePortfolioChart() {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    
    if (chartInstances.portfolioChart) {
        chartInstances.portfolioChart.destroy();
    }
    
    const chronologicalTrades = [...allTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let balance = portfolioSettings.startingCapital;
    
    const portfolioData = [{ x: chronologicalTrades[0]?.date || new Date().toISOString(), y: balance }];
    
    chronologicalTrades.forEach(trade => {
        balance += parseFloat(trade.net_pl) || 0;
        portfolioData.push({
            x: trade.date,
            y: balance
        });
    });
    
    chartInstances.portfolioChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Starting Capital',
                    data: [{ x: portfolioData[0].x, y: portfolioSettings.startingCapital }, 
                           { x: portfolioData[portfolioData.length - 1].x, y: portfolioSettings.startingCapital }],
                    borderColor: '#ff4444',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    fill: false,
                    borderDash: [5, 5]
                },
                {
                    label: 'Portfolio Balance',
                    data: portfolioData,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updateStrategyChart() {
    const ctx = document.getElementById('strategyChart').getContext('2d');
    
    if (chartInstances.strategyChart) {
        chartInstances.strategyChart.destroy();
    }
    
    const strategyData = {};
    allTrades.forEach(trade => {
        if (!strategyData[trade.strategy]) {
            strategyData[trade.strategy] = 0;
        }
        strategyData[trade.strategy] += parseFloat(trade.net_pl) || 0;
    });
    
    const labels = Object.keys(strategyData);
    const data = Object.values(strategyData);
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
    
    chartInstances.strategyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'P&L by Strategy',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updateTickerChart() {
    const ctx = document.getElementById('tickerChart').getContext('2d');
    
    if (chartInstances.tickerChart) {
        chartInstances.tickerChart.destroy();
    }
    
    const tickerData = {};
    allTrades.forEach(trade => {
        if (!tickerData[trade.ticker]) {
            tickerData[trade.ticker] = 0;
        }
        tickerData[trade.ticker] += parseFloat(trade.net_pl) || 0;
    });
    
    // Get top 10 tickers by absolute P&L
    const sortedTickers = Object.entries(tickerData)
        .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a))
        .slice(0, 10);
    
    const labels = sortedTickers.map(([ticker]) => ticker);
    const data = sortedTickers.map(([,pl]) => pl);
    const colors = ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C', '#964325', '#944454', '#13343B'];
    
    chartInstances.tickerChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'P&L by Ticker',
                data: data.map(Math.abs), // Use absolute values for pie chart
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#1a1a2e',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updateMonthlyChart() {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    if (chartInstances.monthlyChart) {
        chartInstances.monthlyChart.destroy();
    }
    
    const monthlyData = {};
    allTrades.forEach(trade => {
        const date = new Date(trade.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = 0;
        }
        monthlyData[monthKey] += parseFloat(trade.net_pl) || 0;
    });
    
    const sortedMonths = Object.keys(monthlyData).sort();
    const labels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(year, monthNum - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    });
    const data = sortedMonths.map(month => monthlyData[month]);
    
    chartInstances.monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Monthly P&L',
                data: data,
                backgroundColor: data.map(value => value >= 0 ? '#00ff88' : '#ff4444'),
                borderColor: data.map(value => value >= 0 ? '#00ff88' : '#ff4444'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updateAnalyticsCharts() {
    const { hourData, dayData, dayNames } = calculateTimeBasedMetrics();
    
    updateWinRateDayChart(dayData, dayNames);
    updateWinRateHourChart(hourData);
    updatePLDayChart(dayData, dayNames);
}

function updateWinRateDayChart(dayData, dayNames) {
    const ctx = document.getElementById('winRateDayChart').getContext('2d');
    
    if (chartInstances.winRateDayChart) {
        chartInstances.winRateDayChart.destroy();
    }
    
    const winRates = dayData.map(day => day.total > 0 ? (day.wins / day.total) * 100 : 0);
    
    chartInstances.winRateDayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dayNames,
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                backgroundColor: '#4dabf7',
                borderColor: '#4dabf7',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updateWinRateHourChart(hourData) {
    const ctx = document.getElementById('winRateHourChart').getContext('2d');
    
    if (chartInstances.winRateHourChart) {
        chartInstances.winRateHourChart.destroy();
    }
    
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const winRates = hourData.map(hour => hour.total > 0 ? (hour.wins / hour.total) * 100 : 0);
    
    chartInstances.winRateHourChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours.map(h => `${h}:00`),
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0, 255, 136, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

function updatePLDayChart(dayData, dayNames) {
    const ctx = document.getElementById('plDayChart').getContext('2d');
    
    if (chartInstances.plDayChart) {
        chartInstances.plDayChart.destroy();
    }
    
    const plData = dayData.map(day => day.pl);
    
    chartInstances.plDayChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dayNames,
            datasets: [{
                label: 'P&L by Day',
                data: plData,
                backgroundColor: plData.map(value => value >= 0 ? '#00ff88' : '#ff4444'),
                borderColor: plData.map(value => value >= 0 ? '#00ff88' : '#ff4444'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#a0a0a0',
                        callback: function(value) {
                            return '$' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff'
                    }
                }
            }
        }
    });
}

// CSV Import/Export
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
            const values = parseCSVLine(lines[i]);
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
    }
    
    return { headers, data };
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"' && inQuotes && nextChar === '"') {
            current += '"';
            i++; // Skip next quote
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function previewCSV() {
    const fileInput = document.getElementById('csvFileInput');
    if (!fileInput.files.length) {
        showMessage('Please select a CSV file first.', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const csvText = e.target.result;
            const { headers, data } = parseCSV(csvText);
            
            // Show preview
            const previewDiv = document.getElementById('csvPreview');
            const previewHeader = document.getElementById('previewHeader');
            const previewBody = document.getElementById('previewBody');
            
            previewHeader.innerHTML = '<tr>' + headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
            
            const previewRows = data.slice(0, 10); // Show first 10 rows
            previewBody.innerHTML = previewRows.map(row => 
                '<tr>' + headers.map(h => `<td>${row[h] || ''}</td>`).join('') + '</tr>'
            ).join('');
            
            previewDiv.style.display = 'block';
            document.getElementById('importCsvBtn').disabled = false;
            
            // Store parsed data for import
            window.csvImportData = data;
            
            showMessage(`CSV preview loaded. Found ${data.length} rows.`, 'success');
        } catch (error) {
            console.error('Failed to parse CSV:', error);
            showMessage('Failed to parse CSV file. Please check the format.', 'error');
        }
    };
    
    reader.readAsText(file);
}

async function importCSV() {
    if (!window.csvImportData) {
        showMessage('Please preview the CSV file first.', 'error');
        return;
    }
    
    try {
        let importedCount = 0;
        
        for (const row of window.csvImportData) {
            // Map CSV columns to trade object
            const tradeData = {
                date: row.date || row.Date,
                ticker: (row.ticker || row.Ticker || '').toUpperCase(),
                strategy: row.strategy || row.Strategy,
                option_type: row.option_type || row.OptionType || 'CALL',
                strike: parseFloat(row.strike || row.Strike) || null,
                expiration: row.expiration || row.Expiration || null,
                quantity: parseInt(row.quantity || row.Quantity) || 1,
                entry_price: parseFloat(row.entry_price || row.EntryPrice) || 0,
                exit_price: parseFloat(row.exit_price || row.ExitPrice) || null,
                premium: parseFloat(row.premium || row.Premium) || 0,
                fees: parseFloat(row.fees || row.Fees) || 0,
                net_pl: parseFloat(row.net_pl || row.NetPL || row.PL) || 0,
                outcome: row.outcome || row.Outcome || 'Win',
                delta: parseFloat(row.delta || row.Delta) || null,
                gamma: parseFloat(row.gamma || row.Gamma) || null,
                theta: parseFloat(row.theta || row.Theta) || null,
                vega: parseFloat(row.vega || row.Vega) || null,
                trade_notes: row.trade_notes || row.TradeNotes || row.Notes || '',
                post_trade_analysis: row.post_trade_analysis || row.PostTradeAnalysis || row.Analysis || ''
            };
            
            // Validate required fields
            if (tradeData.date && tradeData.ticker && tradeData.strategy) {
                await addTrade(tradeData);
                importedCount++;
            }
        }
        
        // Clean up
        delete window.csvImportData;
        document.getElementById('csvFileInput').value = '';
        document.getElementById('csvPreview').style.display = 'none';
        document.getElementById('importCsvBtn').disabled = true;
        
        displayTrades();
        updateDashboard();
        updateFilters();
        
        showMessage(`Successfully imported ${importedCount} trades!`, 'success');
    } catch (error) {
        console.error('Failed to import CSV:', error);
        showMessage('Failed to import CSV. Please try again.', 'error');
    }
}

function exportToCSV() {
    if (allTrades.length === 0) {
        showMessage('No trades to export.', 'error');
        return;
    }
    
    try {
        const headers = [
            'date', 'ticker', 'strategy', 'option_type', 'strike', 'expiration',
            'quantity', 'entry_price', 'exit_price', 'premium', 'fees', 'net_pl',
            'outcome', 'delta', 'gamma', 'theta', 'vega', 'trade_notes', 'post_trade_analysis'
        ];
        
        let csv = headers.join(',') + '\n';
        
        allTrades.forEach(trade => {
            const row = headers.map(header => {
                let value = trade[header] || '';
                // Escape quotes and wrap in quotes if contains comma or quote
                if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            });
            csv += row.join(',') + '\n';
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trading_journal_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showMessage('CSV exported successfully!', 'success');
    } catch (error) {
        console.error('Failed to export CSV:', error);
        showMessage('Failed to export CSV. Please try again.', 'error');
    }
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function showMessage(message, type = 'info') {
    // Remove any existing messages
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message--${type}`;
    messageDiv.textContent = message;
    
    // Insert at the top of the container
    const container = document.querySelector('.container');
    container.insertBefore(messageDiv, container.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 5000);
}

// Make functions available globally for onclick handlers
window.sortTradesByColumn = sortTradesByColumn;
window.openEditModal = openEditModal;
window.openViewModal = openViewModal;
window.confirmDeleteTrade = confirmDeleteTrade;