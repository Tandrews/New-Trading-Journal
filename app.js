// Trading Journal with IndexedDB
class TradingJournal {
    constructor() {
        this.db = null;
        this.trades = [];
        this.notes = [];
        this.actionItems = [];
        this.filteredTrades = [];
        this.charts = {};
        this.init();
    }

    // Initialize IndexedDB and app
    async init() {
        try {
            await this.initDB();
            await this.loadAllData();
            this.setupEventListeners();
            this.showTab('dashboard');
            this.updateDashboard();
            this.updateTradeHistory();
            console.log('Trading Journal initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Trading Journal:', error);
            this.showMessage('error', 'Failed to initialize application. Please refresh the page.');
        }
    }

    // Initialize IndexedDB
    async initDB() {
        this.db = await idb.openDB('tradingJournalDB', 1, {
            upgrade(db) {
                // Trades store
                if (!db.objectStoreNames.contains('trades')) {
                    const tradesStore = db.createObjectStore('trades', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                    tradesStore.createIndex('date', 'date');
                    tradesStore.createIndex('ticker', 'ticker');
                    tradesStore.createIndex('strategy', 'strategy');
                }

                // Notes store
                if (!db.objectStoreNames.contains('notes')) {
                    db.createObjectStore('notes', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }

                // Action items store
                if (!db.objectStoreNames.contains('actionItems')) {
                    db.createObjectStore('actionItems', { 
                        keyPath: 'id', 
                        autoIncrement: true 
                    });
                }
            }
        });
    }

    // Load all data from IndexedDB
    async loadAllData() {
        try {
            const [trades, notes, actionItems] = await Promise.all([
                this.db.getAll('trades'),
                this.db.getAll('notes'),
                this.db.getAll('actionItems')
            ]);

            this.trades = trades.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.notes = notes;
            this.actionItems = actionItems;
            this.filteredTrades = [...this.trades];

            console.log(`Loaded ${this.trades.length} trades, ${this.notes.length} notes, ${this.actionItems.length} action items`);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showTab(e.target.dataset.tab);
            });
        });

        // Trade form
        const tradeForm = document.getElementById('trade-form');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => this.handleAddTrade(e));

            // Auto-calculate Net P&L
            ['entry-price', 'exit-price', 'quantity', 'premium', 'fees'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.addEventListener('input', () => this.calculateNetPL());
                }
            });

            // Set default date to today
            document.getElementById('trade-date').value = new Date().toISOString().split('T')[0];
        }

        // Import functionality
        this.setupImportListeners();

        // Trade history
        this.setupTradeHistoryListeners();

        // Dashboard filters
        this.setupDashboardListeners();

        // Chatbot
        this.setupChatbotListeners();

        // Notes
        this.setupNotesListeners();

        // Export
        this.setupExportListeners();
    }

    // Show specific tab
    showTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Show selected tab content
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }

        // Add active class to selected tab button
        const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }

        // Load tab-specific data
        switch(tabName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'trade-history':
                this.updateTradeHistory();
                break;
            case 'notes':
                this.updateNotesTab();
                break;
            default:
                break;
        }
    }

    // Calculate Net P&L automatically
    calculateNetPL() {
        const entryPrice = parseFloat(document.getElementById('entry-price').value) || 0;
        const exitPrice = parseFloat(document.getElementById('exit-price').value) || 0;
        const quantity = parseFloat(document.getElementById('quantity').value) || 0;
        const premium = parseFloat(document.getElementById('premium').value) || 0;
        const fees = parseFloat(document.getElementById('fees').value) || 0;

        let netPL = 0;
        if (exitPrice && entryPrice) {
            netPL = ((exitPrice - entryPrice) * quantity) + premium + fees;
        } else if (premium) {
            netPL = premium + fees;
        }

        document.getElementById('net-pl').value = netPL.toFixed(2);
    }

    // Handle add trade form submission
    async handleAddTrade(e) {
        e.preventDefault();

        try {
            const formData = new FormData(e.target);
            const trade = {
                date: document.getElementById('trade-date').value,
                ticker: document.getElementById('ticker').value.toUpperCase(),
                strategy: document.getElementById('strategy').value,
                strike: document.getElementById('strike').value,
                expiration: document.getElementById('expiration').value,
                option_type: document.getElementById('option-type').value,
                entry_price: parseFloat(document.getElementById('entry-price').value) || null,
                exit_price: parseFloat(document.getElementById('exit-price').value) || null,
                quantity: parseInt(document.getElementById('quantity').value) || 1,
                premium: parseFloat(document.getElementById('premium').value) || 0,
                fees: parseFloat(document.getElementById('fees').value) || 0,
                net_pl: parseFloat(document.getElementById('net-pl').value) || 0,
                delta: parseFloat(document.getElementById('delta').value) || null,
                gamma: parseFloat(document.getElementById('gamma').value) || null,
                theta: parseFloat(document.getElementById('theta').value) || null,
                vega: parseFloat(document.getElementById('vega').value) || null,
                trade_notes: document.getElementById('trade-notes').value || '',
                decision_rationale: document.getElementById('decision-rationale').value || '',
                outcome: parseFloat(document.getElementById('net-pl').value) >= 0 ? 'Win' : 'Loss',
                created_at: new Date().toISOString()
            };

            // Add to IndexedDB
            const id = await this.db.add('trades', trade);
            trade.id = id;

            // Add to local array
            this.trades.unshift(trade);
            this.filteredTrades = [...this.trades];

            // Update UI
            this.updateDashboard();
            this.updateTradeHistory();

            // Show success message and reset form
            this.showMessage('success', 'Trade added successfully!', 'add-trade-message');
            e.target.reset();
            document.getElementById('trade-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('net-pl').value = '';

        } catch (error) {
            console.error('Error adding trade:', error);
            this.showMessage('error', 'Failed to add trade. Please try again.', 'add-trade-message');
        }
    }

    // Delete trade
    async deleteTrade(id) {
        if (!confirm('Are you sure you want to delete this trade?')) return;

        try {
            await this.db.delete('trades', id);
            this.trades = this.trades.filter(trade => trade.id !== id);
            this.filteredTrades = this.filteredTrades.filter(trade => trade.id !== id);

            this.updateDashboard();
            this.updateTradeHistory();
            this.showMessage('success', 'Trade deleted successfully!');
        } catch (error) {
            console.error('Error deleting trade:', error);
            this.showMessage('error', 'Failed to delete trade.');
        }
    }

    // Clear all trades
    async clearAllTrades() {
        const confirmation = prompt('Type "DELETE ALL" to confirm clearing all trades:');
        if (confirmation !== 'DELETE ALL') return;

        try {
            await this.db.clear('trades');
            this.trades = [];
            this.filteredTrades = [];

            this.updateDashboard();
            this.updateTradeHistory();
            this.showMessage('success', 'All trades cleared successfully!');
        } catch (error) {
            console.error('Error clearing trades:', error);
            this.showMessage('error', 'Failed to clear trades.');
        }
    }    // Update dashboard metrics and charts
    updateDashboard() {
        this.calculateMetrics();
        this.updateCharts();
        this.populateFilterDropdowns();
    }

    // Calculate trading metrics
    calculateMetrics() {
        const trades = this.filteredTrades;

        // Basic metrics
        const totalPL = trades.reduce((sum, trade) => sum + (trade.net_pl || 0), 0);
        const wins = trades.filter(trade => trade.outcome === 'Win').length;
        const losses = trades.filter(trade => trade.outcome === 'Loss').length;
        const totalTrades = wins + losses;
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100) : 0;

        const winningTrades = trades.filter(trade => trade.outcome === 'Win');
        const losingTrades = trades.filter(trade => trade.outcome === 'Loss');

        const avgWin = winningTrades.length > 0 ? 
            winningTrades.reduce((sum, trade) => sum + (trade.net_pl || 0), 0) / winningTrades.length : 0;
        const avgLoss = losingTrades.length > 0 ? 
            losingTrades.reduce((sum, trade) => sum + (trade.net_pl || 0), 0) / losingTrades.length : 0;

        // Calculate current streak
        let currentStreak = 0;
        let streakType = '';
        if (trades.length > 0) {
            const lastOutcome = trades[0].outcome;
            for (let trade of trades) {
                if (trade.outcome === lastOutcome) {
                    currentStreak++;
                } else {
                    break;
                }
            }
            streakType = lastOutcome === 'Win' ? 'W' : 'L';
        }

        // Update UI
        this.updateMetricElement('total-pl', this.formatCurrency(totalPL), totalPL >= 0 ? 'positive' : 'negative');
        this.updateMetricElement('win-rate', `${winRate.toFixed(1)}%`, winRate >= 50 ? 'positive' : 'negative');
        this.updateMetricElement('avg-win', this.formatCurrency(avgWin), 'positive');
        this.updateMetricElement('avg-loss', this.formatCurrency(avgLoss), 'negative');
        this.updateMetricElement('total-trades', totalTrades.toString());
        this.updateMetricElement('current-streak', `${currentStreak}${streakType}`);
    }

    // Update metric element with value and class
    updateMetricElement(id, value, className = '') {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.className = 'metric-value';
            if (className) {
                element.classList.add(className);
            }
        }
    }

    // Update all charts
    updateCharts() {
        this.createPLOverTimeChart();
        this.createStrategyPerformanceChart();
        this.createTopTickersChart();
        this.createMonthlyPLChart();
    }

    // Create P&L Over Time Chart
    createPLOverTimeChart() {
        const canvas = document.getElementById('pl-over-time');
        if (!canvas) return;

        if (this.charts.plOverTime) {
            this.charts.plOverTime.destroy();
        }

        const trades = [...this.filteredTrades].reverse(); // Chronological order
        const data = [];
        let cumulativePL = 0;

        trades.forEach(trade => {
            cumulativePL += trade.net_pl || 0;
            data.push({
                x: trade.date,
                y: cumulativePL,
                trade: trade
            });
        });

        const ctx = canvas.getContext('2d');
        this.charts.plOverTime = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Cumulative P&L',
                    data: data,
                    borderColor: function(context) {
                        const value = context.parsed.y;
                        return value >= 0 ? '#00ff88' : '#ff4444';
                    },
                    backgroundColor: function(context) {
                        const value = context.parsed.y;
                        return value >= 0 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)';
                    },
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animations: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day',
                            displayFormats: {
                                day: 'MM/DD'
                            }
                        },
                        ticks: { color: '#ffffff', font: { size: 12 } },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { 
                            color: '#ffffff', 
                            font: { size: 12 },
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            title: (context) => {
                                const trade = context[0].raw.trade;
                                return `Date: ${new Date(trade.date).toLocaleDateString()}`;
                            },
                            label: (context) => {
                                const trade = context.raw.trade;
                                return [
                                    `P&L: ${this.formatCurrency(context.parsed.y)}`,
                                    `Trade: ${trade.ticker} ${trade.strategy}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // Create Strategy Performance Chart
    createStrategyPerformanceChart() {
        const canvas = document.getElementById('strategy-performance');
        if (!canvas) return;

        if (this.charts.strategyPerformance) {
            this.charts.strategyPerformance.destroy();
        }

        const strategyData = {};
        this.filteredTrades.forEach(trade => {
            const strategy = trade.strategy;
            if (!strategyData[strategy]) {
                strategyData[strategy] = { pl: 0, wins: 0, total: 0 };
            }
            strategyData[strategy].pl += trade.net_pl || 0;
            strategyData[strategy].total += 1;
            if (trade.outcome === 'Win') strategyData[strategy].wins += 1;
        });

        const labels = Object.keys(strategyData);
        const plData = labels.map(strategy => strategyData[strategy].pl);
        const colors = plData.map(pl => pl >= 0 ? '#00ff88' : '#ff4444');

        const ctx = canvas.getContext('2d');
        this.charts.strategyPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'P&L by Strategy',
                    data: plData,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animations: false,
                scales: {
                    x: {
                        ticks: { color: '#ffffff', font: { size: 11 } },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { 
                            color: '#ffffff', 
                            font: { size: 12 },
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: (context) => {
                                const strategy = context.label;
                                const data = strategyData[strategy];
                                const winRate = ((data.wins / data.total) * 100).toFixed(1);
                                return [
                                    `Strategy: ${strategy}`,
                                    `P&L: ${this.formatCurrency(context.parsed.y)}`,
                                    `Win Rate: ${winRate}%`,
                                    `Trades: ${data.total}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // Create Top Tickers Chart
    createTopTickersChart() {
        const canvas = document.getElementById('top-tickers');
        if (!canvas) return;

        if (this.charts.topTickers) {
            this.charts.topTickers.destroy();
        }

        const tickerData = {};
        this.filteredTrades.forEach(trade => {
            const ticker = trade.ticker;
            if (!tickerData[ticker]) {
                tickerData[ticker] = { count: 0, pl: 0 };
            }
            tickerData[ticker].count += 1;
            tickerData[ticker].pl += trade.net_pl || 0;
        });

        const sortedTickers = Object.entries(tickerData)
            .sort(([,a], [,b]) => b.count - a.count)
            .slice(0, 10);

        const labels = sortedTickers.map(([ticker]) => ticker);
        const data = sortedTickers.map(([,data]) => data.count);
        const colors = ['#00ff88', '#ff4444', '#ffaa00', '#00aaff', '#ff00aa', 
                       '#aa00ff', '#ffff00', '#00ffff', '#ff8800', '#8800ff'];

        const ctx = canvas.getContext('2d');
        this.charts.topTickers = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: '#21232a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animations: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#ffffff', font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: (context) => {
                                const ticker = context.label;
                                const data = tickerData[ticker];
                                const percentage = ((data.count / this.filteredTrades.length) * 100).toFixed(1);
                                return [
                                    `Ticker: ${ticker}`,
                                    `Trades: ${data.count} (${percentage}%)`,
                                    `P&L: ${this.formatCurrency(data.pl)}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    // Create Monthly P&L Chart
    createMonthlyPLChart() {
        const canvas = document.getElementById('monthly-pl');
        if (!canvas) return;

        if (this.charts.monthlyPL) {
            this.charts.monthlyPL.destroy();
        }

        const monthlyData = {};
        this.filteredTrades.forEach(trade => {
            const date = new Date(trade.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { pl: 0, wins: 0, losses: 0 };
            }
            monthlyData[monthKey].pl += trade.net_pl || 0;
            if (trade.outcome === 'Win') monthlyData[monthKey].wins += 1;
            if (trade.outcome === 'Loss') monthlyData[monthKey].losses += 1;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(year, monthNum - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        const plData = sortedMonths.map(month => monthlyData[month].pl);
        const colors = plData.map(pl => pl >= 0 ? '#00ff88' : '#ff4444');

        const ctx = canvas.getContext('2d');
        this.charts.monthlyPL = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly P&L',
                    data: plData,
                    backgroundColor: colors,
                    borderColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animations: false,
                scales: {
                    x: {
                        ticks: { color: '#ffffff', font: { size: 11 } },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    y: {
                        ticks: { 
                            color: '#ffffff', 
                            font: { size: 12 },
                            callback: (value) => this.formatCurrency(value)
                        },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        callbacks: {
                            label: (context) => {
                                const monthKey = sortedMonths[context.dataIndex];
                                const data = monthlyData[monthKey];
                                return [
                                    `Month: ${context.label}`,
                                    `P&L: ${this.formatCurrency(context.parsed.y)}`,
                                    `Wins: ${data.wins}`,
                                    `Losses: ${data.losses}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }    // Setup dashboard listeners
    setupDashboardListeners() {
        const applyFilters = document.getElementById('apply-filters');
        if (applyFilters) {
            applyFilters.addEventListener('click', () => this.applyDashboardFilters());
        }
    }

    // Apply dashboard filters
    applyDashboardFilters() {
        const tickerFilter = document.getElementById('ticker-filter').value;
        const strategyFilter = document.getElementById('strategy-filter').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;

        this.filteredTrades = this.trades.filter(trade => {
            let matches = true;

            if (tickerFilter && trade.ticker !== tickerFilter) matches = false;
            if (strategyFilter && trade.strategy !== strategyFilter) matches = false;
            if (dateFrom && trade.date < dateFrom) matches = false;
            if (dateTo && trade.date > dateTo) matches = false;

            return matches;
        });

        this.updateDashboard();
    }

    // Populate filter dropdowns
    populateFilterDropdowns() {
        const tickers = [...new Set(this.trades.map(trade => trade.ticker))].sort();

        // Dashboard ticker filter
        const tickerFilter = document.getElementById('ticker-filter');
        if (tickerFilter) {
            tickerFilter.innerHTML = '<option value="">All Tickers</option>';
            tickers.forEach(ticker => {
                const option = document.createElement('option');
                option.value = ticker;
                option.textContent = ticker;
                tickerFilter.appendChild(option);
            });
        }

        // History ticker filter
        const historyTickerFilter = document.getElementById('history-ticker-filter');
        if (historyTickerFilter) {
            historyTickerFilter.innerHTML = '<option value="">All Tickers</option>';
            tickers.forEach(ticker => {
                const option = document.createElement('option');
                option.value = ticker;
                option.textContent = ticker;
                historyTickerFilter.appendChild(option);
            });
        }

        // Strategy filters
        const strategies = [...new Set(this.trades.map(trade => trade.strategy))].sort();
        const historyStrategyFilter = document.getElementById('history-strategy-filter');
        if (historyStrategyFilter) {
            historyStrategyFilter.innerHTML = '<option value="">All Strategies</option>';
            strategies.forEach(strategy => {
                const option = document.createElement('option');
                option.value = strategy;
                option.textContent = strategy;
                historyStrategyFilter.appendChild(option);
            });
        }
    }

    // Setup import listeners
    setupImportListeners() {
        const uploadArea = document.getElementById('upload-area');
        const csvFileInput = document.getElementById('csv-file');
        const uploadPreview = document.getElementById('upload-preview');
        const commitSave = document.getElementById('commit-save');
        const cancelImport = document.getElementById('cancel-import');

        // File upload area
        if (uploadArea && csvFileInput) {
            uploadArea.addEventListener('click', () => csvFileInput.click());
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    csvFileInput.files = files;
                }
            });
        }

        // Upload and preview
        if (uploadPreview) {
            uploadPreview.addEventListener('click', () => this.handleFileUpload());
        }

        // Commit and save
        if (commitSave) {
            commitSave.addEventListener('click', () => this.commitImport());
        }

        // Cancel import
        if (cancelImport) {
            cancelImport.addEventListener('click', () => this.cancelImport());
        }
    }

    // Handle file upload and preview
    async handleFileUpload() {
        const fileInput = document.getElementById('csv-file');
        const file = fileInput.files[0];

        if (!file) {
            this.showMessage('error', 'Please select a CSV file first.', 'import-message');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showMessage('error', 'Please select a valid CSV file.', 'import-message');
            return;
        }

        try {
            const text = await file.text();
            const parsed = Papa.parse(text, { 
                header: true, 
                skipEmptyLines: true,
                transformHeader: (header) => header.trim()
            });

            if (parsed.errors.length > 0) {
                console.warn('CSV parsing warnings:', parsed.errors);
            }

            this.previewData = parsed.data.filter(row => 
                row.Date && row.Ticker && row.Strategy
            ).map(row => ({
                date: this.parseDate(row.Date),
                ticker: (row.Ticker || '').toString().toUpperCase(),
                strategy: row.Strategy || '',
                entry_price: this.parseNumber(row.Entry_Price),
                exit_price: this.parseNumber(row.Exit_Price),
                strike: row.Strike || '',
                premium: this.parseNumber(row.Premium) || 0,
                quantity: this.parseNumber(row.Quantity) || 1,
                expiration: this.parseDate(row.Expiration),
                option_type: row.Option_Type || 'CALL',
                delta: this.parseNumber(row.Delta),
                gamma: this.parseNumber(row.Gamma),
                theta: this.parseNumber(row.Theta),
                vega: this.parseNumber(row.Vega),
                fees: this.parseNumber(row.Fees) || -0.27,
                net_pl: this.parseNumber(row.Net_PL) || this.parseNumber(row.Win_Loss_Amount) || 0,
                outcome: this.normalizeOutcome(row.Outcome),
                trade_notes: row.Trade_Notes || '',
                decision_rationale: row.Decision_Rationale || ''
            }));

            this.displayPreview();
            this.showMessage('success', `Parsed ${this.previewData.length} trades successfully.`, 'import-message');

        } catch (error) {
            console.error('Error parsing CSV:', error);
            this.showMessage('error', 'Failed to parse CSV file. Please check the format.', 'import-message');
        }
    }

    // Display import preview
    displayPreview() {
        const previewSection = document.getElementById('preview-section');
        const previewTable = document.getElementById('preview-table');
        const previewStatus = document.getElementById('preview-status');
        const previewCount = document.getElementById('preview-count');

        if (!previewSection || !previewTable) return;

        previewSection.style.display = 'block';
        previewStatus.textContent = 'Data Previewed - Not Saved Yet';
        previewStatus.className = 'warning';
        previewCount.textContent = `Previewing ${this.previewData.length} trades`;

        // Create table headers
        const headers = ['Date', 'Ticker', 'Strategy', 'Strike', 'Premium', 'Net P&L', 'Outcome'];
        previewTable.innerHTML = `
            <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${this.previewData.slice(0, 10).map(trade => `
                    <tr>
                        <td>${trade.date}</td>
                        <td>${trade.ticker}</td>
                        <td>${trade.strategy}</td>
                        <td>${trade.strike}</td>
                        <td>${this.formatCurrency(trade.premium)}</td>
                        <td class="${trade.net_pl >= 0 ? 'positive' : 'negative'}">
                            ${this.formatCurrency(trade.net_pl)}
                        </td>
                        <td class="outcome-${trade.outcome.toLowerCase()}">${trade.outcome}</td>
                    </tr>
                `).join('')}
                ${this.previewData.length > 10 ? `<tr><td colspan="${headers.length}"><em>... and ${this.previewData.length - 10} more trades</em></td></tr>` : ''}
            </tbody>
        `;
    }

    // Commit import
    async commitImport() {
        if (!this.previewData || this.previewData.length === 0) {
            this.showMessage('error', 'No data to import.', 'import-message');
            return;
        }

        const mode = document.querySelector('input[name="import-mode"]:checked').value;

        try {
            if (mode === 'replace') {
                if (!confirm('This will delete all existing trades. Are you sure?')) return;
                await this.db.clear('trades');
                this.trades = [];
            }

            // Add trades to IndexedDB
            for (const trade of this.previewData) {
                const id = await this.db.add('trades', trade);
                trade.id = id;
            }

            // Update local data
            if (mode === 'replace') {
                this.trades = [...this.previewData];
            } else {
                this.trades = [...this.previewData, ...this.trades];
            }

            this.trades.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.filteredTrades = [...this.trades];

            // Update UI
            this.updateDashboard();
            this.updateTradeHistory();

            // Update preview status
            document.getElementById('preview-status').textContent = 'Data Committed Successfully';
            document.getElementById('preview-status').className = 'success';

            this.showMessage('success', `Successfully imported ${this.previewData.length} trades!`, 'import-message');
            this.previewData = null;

        } catch (error) {
            console.error('Error committing import:', error);
            this.showMessage('error', 'Failed to import trades. Please try again.', 'import-message');
        }
    }

    // Cancel import
    cancelImport() {
        document.getElementById('preview-section').style.display = 'none';
        document.getElementById('csv-file').value = '';
        this.previewData = null;
        this.showMessage('info', 'Import cancelled.', 'import-message');
    }

    // Setup trade history listeners
    setupTradeHistoryListeners() {
        // Search and filters
        const searchInput = document.getElementById('search-trades');
        const clearFilters = document.getElementById('clear-filters');
        const selectAll = document.getElementById('select-all-trades');
        const deleteSelected = document.getElementById('delete-selected');
        const clearAll = document.getElementById('clear-all-trades');

        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterTradeHistory());
        }

        ['history-ticker-filter', 'history-strategy-filter', 'history-date-from', 'history-date-to'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.filterTradeHistory());
            }
        });

        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearHistoryFilters());
        }

        if (selectAll) {
            selectAll.addEventListener('click', () => this.toggleSelectAll());
        }

        if (deleteSelected) {
            deleteSelected.addEventListener('click', () => this.deleteSelectedTrades());
        }

        if (clearAll) {
            clearAll.addEventListener('click', () => this.clearAllTrades());
        }
    }

    // Filter trade history
    filterTradeHistory() {
        const search = document.getElementById('search-trades').value.toLowerCase();
        const ticker = document.getElementById('history-ticker-filter').value;
        const strategy = document.getElementById('history-strategy-filter').value;
        const dateFrom = document.getElementById('history-date-from').value;
        const dateTo = document.getElementById('history-date-to').value;

        this.filteredTrades = this.trades.filter(trade => {
            let matches = true;

            if (search && !Object.values(trade).some(value => 
                value && value.toString().toLowerCase().includes(search)
            )) {
                matches = false;
            }

            if (ticker && trade.ticker !== ticker) matches = false;
            if (strategy && trade.strategy !== strategy) matches = false;
            if (dateFrom && trade.date < dateFrom) matches = false;
            if (dateTo && trade.date > dateTo) matches = false;

            return matches;
        });

        this.updateTradeHistory();
    }

    // Update trade history table
    updateTradeHistory() {
        const tbody = document.querySelector('#trades-table tbody');
        const tableInfo = document.getElementById('table-info');

        if (!tbody) return;

        tbody.innerHTML = this.filteredTrades.map(trade => `
            <tr>
                <td><input type="checkbox" class="trade-checkbox" data-id="${trade.id}"></td>
                <td>${new Date(trade.date).toLocaleDateString()}</td>
                <td><strong>${trade.ticker}</strong></td>
                <td>${trade.strategy}</td>
                <td>${trade.strike}</td>
                <td>${trade.entry_price ? this.formatCurrency(trade.entry_price) : '-'}</td>
                <td>${trade.exit_price ? this.formatCurrency(trade.exit_price) : '-'}</td>
                <td>${this.formatCurrency(trade.premium)}</td>
                <td class="${trade.net_pl >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(trade.net_pl)}
                </td>
                <td>
                    <span class="outcome-${trade.outcome.toLowerCase()}">${trade.outcome}</span>
                </td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteTrade(${trade.id})" title="Delete Trade">
                        🗑️
                    </button>
                </td>
            </tr>
        `).join('');

        if (tableInfo) {
            tableInfo.textContent = `Showing ${this.filteredTrades.length} trades`;
        }
    }

    // Setup chatbot listeners
    setupChatbotListeners() {
        const sendBtn = document.getElementById('send-chat');
        const chatInput = document.getElementById('chat-input');
        const exampleQueries = document.querySelectorAll('.example-query');

        if (sendBtn && chatInput) {
            sendBtn.addEventListener('click', () => this.handleChatQuery());
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleChatQuery();
            });
        }

        exampleQueries.forEach(btn => {
            btn.addEventListener('click', (e) => {
                chatInput.value = e.target.textContent;
                this.handleChatQuery();
            });
        });
    }

    // Handle chat query
    handleChatQuery() {
        const input = document.getElementById('chat-input');
        const query = input.value.trim();

        if (!query) return;

        this.addChatMessage(query, 'user');
        input.value = '';

        // Process query
        const response = this.processQuery(query);
        setTimeout(() => {
            this.addChatMessage(response, 'bot');
        }, 500);
    }

    // Add chat message
    addChatMessage(message, type) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.innerHTML = message;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Process natural language query
    processQuery(query) {
        const lowerQuery = query.toLowerCase();

        try {
            // Show specific ticker trades
            if (lowerQuery.includes('show') && lowerQuery.includes('trades')) {
                const tickerMatch = lowerQuery.match(/\b[A-Z]{1,5}\b/i);
                if (tickerMatch) {
                    const ticker = tickerMatch[0].toUpperCase();
                    const tickerTrades = this.trades.filter(t => t.ticker === ticker);
                    if (tickerTrades.length === 0) {
                        return `No trades found for ${ticker}.`;
                    }

                    const totalPL = tickerTrades.reduce((sum, t) => sum + t.net_pl, 0);
                    const wins = tickerTrades.filter(t => t.outcome === 'Win').length;
                    const winRate = ((wins / tickerTrades.length) * 100).toFixed(1);

                    return `Found ${tickerTrades.length} trades for ${ticker}:<br>
                            • Total P&L: ${this.formatCurrency(totalPL)}<br>
                            • Win Rate: ${winRate}% (${wins}/${tickerTrades.length})<br>
                            • Recent trades: ${tickerTrades.slice(0, 3).map(t => 
                                `${t.date} ${t.strategy} ${this.formatCurrency(t.net_pl)}`
                            ).join('<br>• ')}`;
                }
            }

            // Average gamma on profitable trades
            if (lowerQuery.includes('average gamma') && lowerQuery.includes('profitable')) {
                const profitableTrades = this.trades.filter(t => t.outcome === 'Win' && t.gamma);
                if (profitableTrades.length === 0) {
                    return "No profitable trades with gamma data found.";
                }
                const avgGamma = profitableTrades.reduce((sum, t) => sum + t.gamma, 0) / profitableTrades.length;
                return `Average gamma on ${profitableTrades.length} profitable trades: ${avgGamma.toFixed(3)}`;
            }

            // Best performing strategies
            if (lowerQuery.includes('best') && lowerQuery.includes('strateg')) {
                const strategyStats = {};
                this.trades.forEach(trade => {
                    if (!strategyStats[trade.strategy]) {
                        strategyStats[trade.strategy] = { pl: 0, count: 0, wins: 0 };
                    }
                    strategyStats[trade.strategy].pl += trade.net_pl;
                    strategyStats[trade.strategy].count += 1;
                    if (trade.outcome === 'Win') strategyStats[trade.strategy].wins += 1;
                });

                const sortedStrategies = Object.entries(strategyStats)
                    .sort(([,a], [,b]) => b.pl - a.pl)
                    .slice(0, 3);

                return `Top performing strategies:<br>` + sortedStrategies.map(([strategy, stats], i) => {
                    const winRate = ((stats.wins / stats.count) * 100).toFixed(1);
                    return `${i + 1}. ${strategy}: ${this.formatCurrency(stats.pl)} (${winRate}% win rate, ${stats.count} trades)`;
                }).join('<br>');
            }

            // Win rate for specific strategy
            if (lowerQuery.includes('win rate') && lowerQuery.includes('iron condor')) {
                const condorTrades = this.trades.filter(t => 
                    t.strategy.toLowerCase().includes('iron condor') || 
                    t.strategy.toLowerCase().includes('condor')
                );
                if (condorTrades.length === 0) {
                    return "No Iron Condor trades found.";
                }
                const wins = condorTrades.filter(t => t.outcome === 'Win').length;
                const winRate = ((wins / condorTrades.length) * 100).toFixed(1);
                const totalPL = condorTrades.reduce((sum, t) => sum + t.net_pl, 0);
                return `Iron Condor performance:<br>
                        • Win Rate: ${winRate}% (${wins}/${condorTrades.length})<br>
                        • Total P&L: ${this.formatCurrency(totalPL)}<br>
                        • Average P&L per trade: ${this.formatCurrency(totalPL / condorTrades.length)}`;
            }

            // General stats
            if (lowerQuery.includes('stats') || lowerQuery.includes('summary')) {
                const totalPL = this.trades.reduce((sum, t) => sum + t.net_pl, 0);
                const wins = this.trades.filter(t => t.outcome === 'Win').length;
                const winRate = ((wins / this.trades.length) * 100).toFixed(1);
                return `Trading Summary:<br>
                        • Total Trades: ${this.trades.length}<br>
                        • Total P&L: ${this.formatCurrency(totalPL)}<br>
                        • Win Rate: ${winRate}%<br>
                        • Most Traded: ${this.getMostTradedTicker()}`;
            }

            return "I can help you analyze your trades. Try asking about specific tickers, strategies, or performance metrics.";

        } catch (error) {
            console.error('Query processing error:', error);
            return "Sorry, I had trouble processing that query. Please try rephrasing your question.";
        }
    }

    // Get most traded ticker
    getMostTradedTicker() {
        const tickerCounts = {};
        this.trades.forEach(trade => {
            tickerCounts[trade.ticker] = (tickerCounts[trade.ticker] || 0) + 1;
        });
        const mostTraded = Object.entries(tickerCounts).sort(([,a], [,b]) => b - a)[0];
        return mostTraded ? `${mostTraded[0]} (${mostTraded[1]} trades)` : 'None';
    }

    // Setup notes listeners
    setupNotesListeners() {
        // Collapsible sections
        document.querySelectorAll('.collapsible').forEach(header => {
            header.addEventListener('click', function() {
                const content = this.nextElementSibling;
                content.style.display = content.style.display === 'none' ? 'block' : 'block';
            });
        });

        // Trading notes
        const saveTradingNotes = document.getElementById('save-trading-notes');
        if (saveTradingNotes) {
            saveTradingNotes.addEventListener('click', () => this.saveTradingNotes());
        }

        // Lessons
        const addLesson = document.getElementById('add-lesson');
        if (addLesson) {
            addLesson.addEventListener('click', () => this.addLesson());
        }

        // Mistakes
        const addMistake = document.getElementById('add-mistake');
        if (addMistake) {
            addMistake.addEventListener('click', () => this.addMistake());
        }

        // Action items
        const addAction = document.getElementById('add-action');
        if (addAction) {
            addAction.addEventListener('click', () => this.addActionItem());
        }

        // Action filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterActionItems(e.target.dataset.filter));
        });
    }

    // Setup export listeners
    setupExportListeners() {
        const exportCSV = document.getElementById('export-csv');
        const exportPDF = document.getElementById('export-pdf');
        const exportJSON = document.getElementById('export-json');
        const importJSON = document.getElementById('import-json');
        const exportLast30 = document.getElementById('export-last-30');
        const exportThisMonth = document.getElementById('export-this-month');
        const exportThisYear = document.getElementById('export-this-year');

        if (exportCSV) exportCSV.addEventListener('click', () => this.exportCSV());
        if (exportPDF) exportPDF.addEventListener('click', () => this.exportPDF());
        if (exportJSON) exportJSON.addEventListener('click', () => this.exportJSON());
        if (importJSON) {
            importJSON.addEventListener('click', () => document.getElementById('json-file').click());
            document.getElementById('json-file').addEventListener('change', (e) => this.importJSON(e));
        }
        if (exportLast30) exportLast30.addEventListener('click', () => this.exportLast30Days());
        if (exportThisMonth) exportThisMonth.addEventListener('click', () => this.exportThisMonth());
        if (exportThisYear) exportThisYear.addEventListener('click', () => this.exportThisYear());
    }

    // Export CSV
    exportCSV(customTrades = null) {
        const trades = customTrades || this.getDateFilteredTrades();
        const dateFrom = document.getElementById('export-date-from').value;
        const dateTo = document.getElementById('export-date-to').value;

        const headers = [
            'Date', 'Ticker', 'Strategy', 'Strike', 'Expiration', 'Option_Type',
            'Entry_Price', 'Exit_Price', 'Quantity', 'Premium', 'Fees', 'Net_PL',
            'Delta', 'Gamma', 'Theta', 'Vega', 'Outcome', 'Trade_Notes', 'Decision_Rationale'
        ];

        const csvContent = [
            headers.join(','),
            ...trades.map(trade => headers.map(header => {
                let value = trade[header.toLowerCase()] || '';
                if (typeof value === 'string' && value.includes(',')) {
                    value = `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(','))
        ].join('\n');

        const dateRange = dateFrom && dateTo ? `_${dateFrom}_to_${dateTo}` : '';
        this.downloadFile(csvContent, `trading-journal${dateRange}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

        this.showMessage('success', `Exported ${trades.length} trades to CSV.`, 'export-message');
    }

    // Export JSON backup
    exportJSON() {
        const data = {
            trades: this.trades,
            notes: this.notes,
            actionItems: this.actionItems,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const jsonContent = JSON.stringify(data, null, 2);
        this.downloadFile(jsonContent, `trading-journal-backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');

        this.showMessage('success', 'Complete backup exported successfully.', 'export-message');
    }

    // Helper functions
    formatCurrency(value) {
        if (value === null || value === undefined) return '$0.00';
        const num = parseFloat(value);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(num);
    }

    parseNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }

    parseDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return isNaN(date.getTime()) ? dateStr : date.toISOString().split('T')[0];
    }

    normalizeOutcome(outcome) {
        if (!outcome) return 'Loss';
        const upper = outcome.toString().toUpperCase();
        return upper === 'WIN' || upper === 'PROFIT' ? 'Win' : 'Loss';
    }

    getDateFilteredTrades() {
        const dateFrom = document.getElementById('export-date-from').value;
        const dateTo = document.getElementById('export-date-to').value;

        return this.trades.filter(trade => {
            let matches = true;
            if (dateFrom && trade.date < dateFrom) matches = false;
            if (dateTo && trade.date > dateTo) matches = false;
            return matches;
        });
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showMessage(type, message, containerId = null) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        const container = containerId ? document.getElementById(containerId) : document.body;
        if (container) {
            // Remove existing message
            const existingMessage = container.querySelector('.message');
            if (existingMessage) {
                existingMessage.remove();
            }

            container.appendChild(messageDiv);
            setTimeout(() => messageDiv.remove(), 5000);
        }
    }

    updateNotesTab() {
        // Implementation for notes tab updates
    }

    exportLast30Days() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const trades = this.trades.filter(trade => new Date(trade.date) >= thirtyDaysAgo);
        this.exportCSV(trades);
    }

    exportThisMonth() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const trades = this.trades.filter(trade => new Date(trade.date) >= firstDay);
        this.exportCSV(trades);
    }

    exportThisYear() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), 0, 1);
        const trades = this.trades.filter(trade => new Date(trade.date) >= firstDay);
        this.exportCSV(trades);
    }

    exportPDF() {
        this.showMessage('info', 'PDF export simulation - In a real app, this would generate a formatted PDF report.', 'export-message');
    }
}

// Initialize the app when page loads
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TradingJournal();
});

// Make app globally available for onclick handlers
window.app = app;