// =============================================================================
// COMPLETE FIXED app.js v2.1 - Proper CSV Parsing + Charts
// =============================================================================
// Fixes: Proper CSV parsing that handles quoted fields with commas
// Added: All 5 interactive charts
// =============================================================================

console.log('🚀 Loading Trading Journal v2.1 with Charts...');

class TradingJournal {
    constructor() {
        console.log('📦 Constructing TradingJournal...');
        this.db = null;
        this.dbName = 'tradingJournalDB';
        this.version = 3;
        this.trades = [];
        this.filteredTrades = [];
        this.currentTab = 'dashboard';
        this.previewData = null;
        this.charts = {};
        this.metrics = {};
        
        // Portfolio properties
        this.startingCapital = 0;
        this.currentBalance = 0;
        this.portfolioHistory = [];
        
        console.log('✅ Constructor complete');
    }

    async init() {
        try {
            console.log('🔧 Starting initialization...');
            
            if (typeof idb === 'undefined') {
                throw new Error('❌ IDB library not loaded!');
            }
            console.log('✅ IDB library loaded');
            
            if (typeof Chart === 'undefined') {
                console.log('⚠️ Chart.js not loaded yet');
            } else {
                console.log('✅ Chart.js loaded');
            }
            
            await this.initDB();
            await this.loadAllData();
            await this.loadPortfolioSettings();
            this.setupEventListeners();
            this.showTab('dashboard');
            await this.updateDashboard();
            
            console.log('🎉 Trading Journal initialized successfully!');
            this.showMessage('success', 'Trading Journal loaded successfully!');
            
        } catch (error) {
            console.error('💥 INITIALIZATION FAILED:', error);
            alert('Failed to initialize app: ' + error.message);
        }
    }

    async initDB() {
        try {
            console.log('🗄️ Initializing database...');
            
            this.db = await idb.openDB(this.dbName, this.version, {
                upgrade(db, oldVersion, newVersion, transaction) {
                    console.log(`📊 Upgrading database from v${oldVersion} to v${newVersion}`);
                    
                    if (!db.objectStoreNames.contains('trades')) {
                        console.log('Creating trades store...');
                        const tradesStore = db.createObjectStore('trades', {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        tradesStore.createIndex('date', 'date');
                        tradesStore.createIndex('ticker', 'ticker');
                        tradesStore.createIndex('strategy', 'strategy');
                        console.log('✅ Trades store created');
                    }
                    
                    if (!db.objectStoreNames.contains('portfolioSettings')) {
                        console.log('Creating portfolioSettings store...');
                        db.createObjectStore('portfolioSettings', { keyPath: 'id' });
                        console.log('✅ Portfolio settings store created');
                    }
                    
                    if (!db.objectStoreNames.contains('portfolioHistory')) {
                        console.log('Creating portfolioHistory store...');
                        const historyStore = db.createObjectStore('portfolioHistory', {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        historyStore.createIndex('date', 'date');
                        console.log('✅ Portfolio history store created');
                    }
                    
                    console.log('✅ Database upgrade complete');
                }
            });
            
            console.log('✅ Database opened successfully');
            console.log('📊 Store names:', Array.from(this.db.objectStoreNames));
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async loadAllData() {
        try {
            console.log('📥 Loading all data...');
            
            this.trades = await this.db.getAll('trades') || [];
            this.trades.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.filteredTrades = [...this.trades];
            
            console.log(`✅ Loaded ${this.trades.length} trades`);
            
        } catch (error) {
            console.error('❌ Error loading data:', error);
            this.trades = [];
            this.filteredTrades = [];
        }
    }

    async loadPortfolioSettings() {
        try {
            console.log('💼 Loading portfolio settings...');
            
            const settings = await this.db.get('portfolioSettings', 'main');
            if (settings) {
                this.startingCapital = settings.startingCapital || 0;
                this.currentBalance = settings.currentBalance || 0;
                console.log(`✅ Portfolio loaded: Capital=${this.startingCapital}, Balance=${this.currentBalance}`);
            } else {
                console.log('ℹ️ No portfolio settings found');
            }
            
            this.portfolioHistory = await this.db.getAll('portfolioHistory') || [];
            this.portfolioHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
            console.log(`✅ Loaded ${this.portfolioHistory.length} portfolio history entries`);
            
        } catch (error) {
            console.error('❌ Error loading portfolio:', error);
        }
    }

    async savePortfolioSettings() {
        try {
            console.log('💾 Saving portfolio settings...');
            
            const settings = {
                id: 'main',
                startingCapital: this.startingCapital,
                currentBalance: this.currentBalance,
                lastUpdated: new Date().toISOString()
            };
            
            await this.db.put('portfolioSettings', settings);
            console.log('✅ Portfolio settings saved:', settings);
            return true;
            
        } catch (error) {
            console.error('❌ Error saving portfolio settings:', error);
            return false;
        }
    }

    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        try {
            // Tab navigation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const tabName = e.target.dataset.tab;
                    console.log('📑 Switching to tab:', tabName);
                    this.showTab(tabName);
                });
            });
            console.log('✅ Tab listeners attached');
            
            // Portfolio settings form
            const portfolioForm = document.getElementById('portfolio-settings-form');
            if (portfolioForm) {
                portfolioForm.addEventListener('submit', (e) => {
                    console.log('💼 Portfolio form submitted');
                    this.handlePortfolioSettings(e);
                });
                console.log('✅ Portfolio form listener attached');
            }
            
            // CSV file upload
            const fileUpload = document.getElementById('csv-file');
            if (fileUpload) {
                fileUpload.addEventListener('change', (e) => {
                    console.log('📄 CSV file selected');
                    this.handleFileUpload(e);
                });
                console.log('✅ File upload listener attached');
            }
            
            // Commit import button
            const commitBtn = document.getElementById('commit-import');
            if (commitBtn) {
                commitBtn.addEventListener('click', () => {
                    console.log('💾 Commit import clicked');
                    this.commitImport();
                });
                console.log('✅ Commit button listener attached');
            }
            
            console.log('✅ All event listeners set up');
            
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }

    async handlePortfolioSettings(e) {
        e.preventDefault();
        console.log('💼 Processing portfolio settings...');
        
        try {
            const formData = new FormData(e.target);
            
            const newStartingCapital = parseFloat(formData.get('starting-capital')) || 0;
            const newCurrentBalance = parseFloat(formData.get('current-balance')) || 0;
            
            console.log('Input values:', {
                startingCapital: newStartingCapital,
                currentBalance: newCurrentBalance
            });
            
            if (newStartingCapital === 0) {
                this.showMessage('error', 'Please enter a starting capital amount');
                return;
            }
            
            this.startingCapital = newStartingCapital;
            this.currentBalance = newCurrentBalance;
            
            const saved = await this.savePortfolioSettings();
            
            if (saved) {
                await this.updateDashboard();
                this.closePortfolioModal();
                this.showMessage('success', `Portfolio settings saved! Capital: ${this.formatCurrency(newStartingCapital)}, Balance: ${this.formatCurrency(newCurrentBalance)}`);
                console.log('✅ Portfolio settings saved successfully');
            } else {
                this.showMessage('error', 'Failed to save portfolio settings');
            }
            
        } catch (error) {
            console.error('❌ Error handling portfolio settings:', error);
            this.showMessage('error', 'Error: ' + error.message);
        }
    }

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        console.log('📄 Reading file:', file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const csvContent = event.target.result;
                console.log('📄 File read, length:', csvContent.length);
                this.parseCSV(csvContent);
            } catch (error) {
                console.error('❌ Error reading file:', error);
                this.showMessage('error', 'Error reading file');
            }
        };
        reader.readAsText(file);
    }

    // FIXED: Proper CSV parser that handles quoted fields
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    parseCSV(csvContent) {
        try {
            console.log('📊 Parsing CSV with proper quoted field handling...');
            
            const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) {
                this.showMessage('error', 'CSV file must have header and data rows');
                return;
            }
            
            // Parse header with proper quote handling
            const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
            console.log('📋 Headers found:', headers.length);
            console.log('📋 Sample headers:', headers.slice(0, 10));
            
            const trades = [];
            let skipped = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                
                // Handle column count mismatch
                if (values.length < headers.length) {
                    // Pad with empty strings
                    while (values.length < headers.length) {
                        values.push('');
                    }
                }
                
                const trade = {};
                headers.forEach((header, index) => {
                    trade[header] = values[index] || '';
                });
                
                // More lenient validation - only require date and ticker
                if (!trade.date || trade.date === '') {
                    skipped++;
                    continue;
                }
                
                if (!trade.ticker || trade.ticker === '') {
                    skipped++;
                    continue;
                }
                
                // Parse numeric fields
                trade.net_pl = parseFloat(trade.net_pl || trade.net_p_l || 0);
                trade.premium = parseFloat(trade.premium || 0);
                trade.fees = parseFloat(trade.fees || -0.65);
                trade.quantity = parseInt(trade.quantity || 1);
                trade.entry_price = trade.entry_price ? parseFloat(trade.entry_price) : null;
                trade.exit_price = trade.exit_price ? parseFloat(trade.exit_price) : null;
                
                // Clean up fields
                trade.ticker = trade.ticker.toUpperCase();
                trade.strategy = trade.strategy || 'Unknown';
                trade.outcome = trade.outcome || ((trade.net_pl >= 0) ? 'Win' : 'Loss');
                trade.created_at = new Date().toISOString();
                
                trades.push(trade);
            }
            
            console.log(`✅ Parsed ${trades.length} trades (skipped ${skipped} invalid rows)`);
            console.log(`📊 Total lines in CSV: ${lines.length - 1}, Successfully parsed: ${trades.length}`);
            
            if (trades.length === 0) {
                this.showMessage('error', 'No valid trades found in CSV');
                return;
            }
            
            this.previewData = trades;
            this.displayPreview(trades);
            this.showMessage('success', `Loaded ${trades.length} trades for preview`, 'import-message');
            
        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            this.showMessage('error', 'Error parsing CSV: ' + error.message);
        }
    }

    displayPreview(trades) {
        console.log('📊 Displaying preview...');
        
        const previewSection = document.getElementById('preview-section');
        const previewTable = document.getElementById('preview-table');
        
        if (!previewSection || !previewTable) {
            console.error('❌ Preview elements not found');
            return;
        }
        
        const totalPL = trades.reduce((sum, trade) => sum + (trade.net_pl || 0), 0);
        
        const tableHTML = `
            <table class="preview-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Ticker</th>
                        <th>Strategy</th>
                        <th>Net P&L</th>
                        <th>Outcome</th>
                    </tr>
                </thead>
                <tbody>
                    ${trades.slice(0, 20).map(trade => `
                        <tr>
                            <td>${new Date(trade.date).toLocaleDateString()}</td>
                            <td>${trade.ticker}</td>
                            <td>${trade.strategy}</td>
                            <td class="${(trade.net_pl || 0) >= 0 ? 'positive' : 'negative'}">
                                ${this.formatCurrency(trade.net_pl || 0)}
                            </td>
                            <td class="outcome-${(trade.outcome || 'loss').toLowerCase()}">${trade.outcome || 'Loss'}</td>
                        </tr>
                    `).join('')}
                    ${trades.length > 20 ? `<tr><td colspan="5">... and ${trades.length - 20} more trades</td></tr>` : ''}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3"><strong>Total (${trades.length} trades):</strong></td>
                        <td class="${totalPL >= 0 ? 'positive' : 'negative'}"><strong>${this.formatCurrency(totalPL)}</strong></td>
                        <td><strong>${trades.filter(t => (t.net_pl || 0) >= 0).length}W / ${trades.filter(t => (t.net_pl || 0) < 0).length}L</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        previewTable.innerHTML = tableHTML;
        previewSection.style.display = 'block';
        
        console.log('✅ Preview displayed');
    }

    async commitImport() {
        if (!this.previewData || this.previewData.length === 0) {
            this.showMessage('error', 'No data to import', 'import-message');
            return;
        }
        
        console.log(`💾 Committing ${this.previewData.length} trades...`);
        
        try {
            const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'append';
            console.log('Import mode:', mode);
            
            if (mode === 'replace') {
                if (!confirm(`This will delete all existing trades and import ${this.previewData.length} new trades. Continue?`)) return;
                await this.db.clear('trades');
                this.trades = [];
                console.log('✅ Cleared existing trades');
            }
            
            let successCount = 0;
            let totalPL = 0;
            
            for (const trade of this.previewData) {
                try {
                    const id = await this.db.add('trades', trade);
                    trade.id = id;
                    this.trades.push(trade);
                    successCount++;
                    totalPL += trade.net_pl || 0;
                } catch (error) {
                    console.error('Error adding trade:', error);
                }
            }
            
            console.log(`✅ Successfully added ${successCount} trades`);
            console.log(`💰 Total P&L: ${this.formatCurrency(totalPL)}`);
            
            // Update portfolio
            this.currentBalance += totalPL;
            await this.savePortfolioSettings();
            
            // Update UI
            this.trades.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.filteredTrades = [...this.trades];
            await this.updateDashboard();
            
            // Show success
            const previewStatus = document.getElementById('preview-status');
            if (previewStatus) {
                previewStatus.textContent = 'Data Committed Successfully ✅';
                previewStatus.style.color = '#00ff88';
            }
            
            this.showMessage('success', `✅ Successfully imported ${successCount} trades! P&L: ${this.formatCurrency(totalPL)}`, 'import-message');
            
            this.previewData = null;
            
        } catch (error) {
            console.error('❌ Import failed:', error);
            this.showMessage('error', 'Import failed: ' + error.message, 'import-message');
        }
    }

    showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const selectedContent = document.getElementById(`${tabName}-tab`);
        if (selectedContent) {
            selectedContent.classList.add('active');
        }
        
        const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('active');
        }
        
        this.currentTab = tabName;
        
        if (tabName === 'dashboard') {
            this.updateDashboard();
        }
    }

    async updateDashboard() {
        console.log('📊 Updating dashboard...');
        this.calculateMetrics();
        this.calculatePortfolioMetrics();
        this.displayMetrics();
        this.displayPortfolioMetrics();
        await this.updateCharts();
        console.log('✅ Dashboard updated');
    }

    calculateMetrics() {
        const trades = this.filteredTrades;
        
        if (trades.length === 0) {
            this.metrics = {
                totalTrades: 0,
                totalPL: 0,
                winRate: 0,
                totalWins: 0,
                totalLosses: 0,
                averageWin: 0,
                averageLoss: 0,
                largestWin: 0,
                largestLoss: 0,
                profitFactor: 0
            };
            return;
        }
        
        const wins = trades.filter(t => (t.net_pl || 0) >= 0);
        const losses = trades.filter(t => (t.net_pl || 0) < 0);
        
        this.metrics = {
            totalTrades: trades.length,
            totalPL: trades.reduce((sum, t) => sum + (t.net_pl || 0), 0),
            winRate: trades.length > 0 ? (wins.length / trades.length) : 0,
            totalWins: wins.length,
            totalLosses: losses.length,
            averageWin: wins.length > 0 ? (wins.reduce((sum, t) => sum + (t.net_pl || 0), 0) / wins.length) : 0,
            averageLoss: losses.length > 0 ? (losses.reduce((sum, t) => sum + (t.net_pl || 0), 0) / losses.length) : 0,
            largestWin: trades.length > 0 ? Math.max(...trades.map(t => t.net_pl || 0)) : 0,
            largestLoss: trades.length > 0 ? Math.min(...trades.map(t => t.net_pl || 0)) : 0,
            profitFactor: losses.length > 0 ? 
                (wins.reduce((sum, t) => sum + (t.net_pl || 0), 0) / Math.abs(losses.reduce((sum, t) => sum + (t.net_pl || 0), 0))) : 
                (wins.length > 0 ? 999 : 0)
        };
    }

    calculatePortfolioMetrics() {
        const totalReturn = this.currentBalance - this.startingCapital;
        const returnPercentage = this.startingCapital > 0 ? (totalReturn / this.startingCapital) : 0;
        
        this.portfolioMetrics = {
            startingCapital: this.startingCapital,
            currentBalance: this.currentBalance,
            totalReturn: totalReturn,
            returnPercentage: returnPercentage,
            maxDrawdown: 0,
            maxBalance: this.currentBalance,
            sharpeRatio: 0,
            tradingDays: this.portfolioHistory.length
        };
    }

    displayMetrics() {
        const elements = {
            'total-trades': this.metrics.totalTrades,
            'total-pl': this.formatCurrency(this.metrics.totalPL),
            'win-rate': this.formatPercentage(this.metrics.winRate),
            'total-wins': this.metrics.totalWins,
            'total-losses': this.metrics.totalLosses,
            'average-win': this.formatCurrency(this.metrics.averageWin),
            'average-loss': this.formatCurrency(this.metrics.averageLoss),
            'largest-win': this.formatCurrency(this.metrics.largestWin),
            'largest-loss': this.formatCurrency(this.metrics.largestLoss),
            'profit-factor': this.metrics.profitFactor.toFixed(2)
        };
        
        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    displayPortfolioMetrics() {
        const portfolioElements = {
            'starting-capital-display': this.formatCurrency(this.portfolioMetrics.startingCapital),
            'current-balance-display': this.formatCurrency(this.portfolioMetrics.currentBalance),
            'total-return-display': this.formatCurrency(this.portfolioMetrics.totalReturn),
            'return-percentage-display': this.formatPercentage(this.portfolioMetrics.returnPercentage),
            'max-drawdown-display': this.formatPercentage(this.portfolioMetrics.maxDrawdown),
            'max-balance-display': this.formatCurrency(this.portfolioMetrics.maxBalance),
            'sharpe-ratio-display': this.portfolioMetrics.sharpeRatio.toFixed(2),
            'trading-days-display': this.portfolioMetrics.tradingDays
        };
        
        Object.entries(portfolioElements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                
                if (id.includes('return') || id.includes('balance')) {
                    const isPositive = id.includes('return') ? 
                        this.portfolioMetrics.totalReturn >= 0 : 
                        this.portfolioMetrics.currentBalance >= this.portfolioMetrics.startingCapital;
                    element.style.color = isPositive ? '#00ff88' : '#ff4444';
                }
            }
        });
    }

    // ADDED: Chart creation methods
    async updateCharts() {
        if (typeof Chart === 'undefined') {
            console.log('⚠️ Chart.js not available, skipping charts');
            return;
        }
        
        console.log('📊 Creating charts...');
        
        try {
            this.createPLChart();
            this.createPortfolioBalanceChart();
            this.createStrategyChart();
            this.createTopTickersChart();
            this.createMonthlyPLChart();
            console.log('✅ All charts created');
        } catch (error) {
            console.error('❌ Error creating charts:', error);
        }
    }

    createPLChart() {
        const ctx = document.getElementById('pl-over-time');
        if (!ctx) return;
        
        if (this.charts.plOverTime) {
            this.charts.plOverTime.destroy();
        }
        
        if (this.filteredTrades.length === 0) {
            ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999;">No data yet</p>';
            return;
        }
        
        const sortedTrades = [...this.filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let cumulative = 0;
        const data = sortedTrades.map(trade => {
            cumulative += trade.net_pl || 0;
            return {
                x: new Date(trade.date),
                y: cumulative
            };
        });
        
        this.charts.plOverTime = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Cumulative P&L',
                    data: data,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'day'
                        },
                        grid: { color: '#333' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        grid: { color: '#333' },
                        ticks: { 
                            color: '#ccc',
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: (context) => 'P&L: ' + this.formatCurrency(context.parsed.y)
                        }
                    }
                }
            }
        });
    }

    createPortfolioBalanceChart() {
        const ctx = document.getElementById('portfolio-balance');
        if (!ctx) return;
        
        if (this.charts.portfolioBalance) {
            this.charts.portfolioBalance.destroy();
        }
        
        if (this.filteredTrades.length === 0) {
            ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999;">No data yet</p>';
            return;
        }
        
        const sortedTrades = [...this.filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let balance = this.startingCapital;
        const data = [{
            x: sortedTrades[0] ? new Date(sortedTrades[0].date) : new Date(),
            y: this.startingCapital
        }];
        
        sortedTrades.forEach(trade => {
            balance += trade.net_pl || 0;
            data.push({
                x: new Date(trade.date),
                y: balance
            });
        });
        
        this.charts.portfolioBalance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Portfolio Balance',
                        data: data,
                        borderColor: '#00aaff',
                        backgroundColor: 'rgba(0, 170, 255, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Starting Capital',
                        data: data.map(d => ({ x: d.x, y: this.startingCapital })),
                        borderColor: '#666',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'day' },
                        grid: { color: '#333' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        grid: { color: '#333' },
                        ticks: { 
                            color: '#ccc',
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    legend: { labels: { color: '#fff' } },
                    tooltip: {
                        callbacks: {
                            label: (context) => context.dataset.label + ': ' + this.formatCurrency(context.parsed.y)
                        }
                    }
                }
            }
        });
    }

    createStrategyChart() {
        const ctx = document.getElementById('strategy-performance');
        if (!ctx) return;
        
        if (this.charts.strategyPerformance) {
            this.charts.strategyPerformance.destroy();
        }
        
        if (this.filteredTrades.length === 0) return;
        
        const strategyData = {};
        this.filteredTrades.forEach(trade => {
            const strategy = trade.strategy || 'Unknown';
            if (!strategyData[strategy]) {
                strategyData[strategy] = 0;
            }
            strategyData[strategy] += trade.net_pl || 0;
        });
        
        const labels = Object.keys(strategyData);
        const data = Object.values(strategyData);
        const colors = data.map(val => val >= 0 ? '#00ff88' : '#ff4444');
        
        this.charts.strategyPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'P&L by Strategy',
                    data: data,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: '#333' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        grid: { color: '#333' },
                        ticks: { 
                            color: '#ccc',
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => 'P&L: ' + this.formatCurrency(context.parsed.y)
                        }
                    }
                }
            }
        });
    }

    createTopTickersChart() {
        const ctx = document.getElementById('top-tickers');
        if (!ctx) return;
        
        if (this.charts.topTickers) {
            this.charts.topTickers.destroy();
        }
        
        if (this.filteredTrades.length === 0) return;
        
        const tickerData = {};
        this.filteredTrades.forEach(trade => {
            const ticker = trade.ticker || 'Unknown';
            if (!tickerData[ticker]) {
                tickerData[ticker] = 0;
            }
            tickerData[ticker] += trade.net_pl || 0;
        });
        
        const sorted = Object.entries(tickerData)
            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
            .slice(0, 10);
        
        const labels = sorted.map(([ticker]) => ticker);
        const data = sorted.map(([, pl]) => pl);
        
        this.charts.topTickers = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data.map(Math.abs),
                    backgroundColor: [
                        '#00ff88', '#00aaff', '#ff4444', '#ffaa00',
                        '#ff00ff', '#00ffff', '#ff8800', '#8800ff',
                        '#00ff00', '#ff0088'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        position: 'right',
                        labels: { color: '#fff' }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const label = context.label;
                                const value = data[context.dataIndex];
                                return label + ': ' + this.formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    createMonthlyPLChart() {
        const ctx = document.getElementById('monthly-pl');
        if (!ctx) return;
        
        if (this.charts.monthlyPL) {
            this.charts.monthlyPL.destroy();
        }
        
        if (this.filteredTrades.length === 0) return;
        
        const monthlyData = {};
        this.filteredTrades.forEach(trade => {
            const date = new Date(trade.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = 0;
            }
            monthlyData[monthKey] += trade.net_pl || 0;
        });
        
        const labels = Object.keys(monthlyData).sort();
        const data = labels.map(month => monthlyData[month]);
        const colors = data.map(val => val >= 0 ? '#00ff88' : '#ff4444');
        
        this.charts.monthlyPL = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly P&L',
                    data: data,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        grid: { color: '#333' },
                        ticks: { color: '#ccc' }
                    },
                    y: {
                        grid: { color: '#333' },
                        ticks: { 
                            color: '#ccc',
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => 'P&L: ' + this.formatCurrency(context.parsed.y)
                        }
                    }
                }
            }
        });
    }

    openPortfolioModal() {
        console.log('📂 Opening portfolio modal...');
        document.getElementById('starting-capital').value = this.startingCapital;
        document.getElementById('current-balance').value = this.currentBalance;
        const modal = document.getElementById('portfolio-settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            console.log('✅ Modal opened');
        }
    }

    closePortfolioModal() {
        console.log('❌ Closing portfolio modal...');
        const modal = document.getElementById('portfolio-settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    showMessage(type, message, containerId = null) {
        console.log(`📢 Message (${type}): ${message}`);
        
        const container = containerId ? document.getElementById(containerId) : document.body;
        if (!container) return;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: #ffffff;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            background: ${type === 'success' ? '#00ff88' : '#ff4444'};
        `;
        
        if (containerId) {
            messageEl.style.position = 'relative';
            messageEl.style.top = '10px';
            messageEl.style.right = 'auto';
            messageEl.style.margin = '10px 0';
        }
        
        messageEl.textContent = message;
        container.appendChild(messageEl);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 5000);
    }

    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    formatPercentage(value) {
        if (value === null || value === undefined) return '0%';
        return (value * 100).toFixed(1) + '%';
    }
}

// Initialize app when DOM is ready
console.log('⏳ Waiting for DOM to load...');

document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM loaded, creating Trading Journal...');
    window.app = new TradingJournal();
    window.app.init().catch(error => {
        console.error('💥 Failed to initialize:', error);
        alert('Failed to initialize Trading Journal. Check console (F12) for details.');
    });
});

// Global function for HTML onclick handlers
window.openPortfolioSettings = function() {
    console.log('🔗 openPortfolioSettings called from HTML');
    if (window.app) {
        window.app.openPortfolioModal();
    } else {
        console.error('❌ App not initialized yet');
        alert('App is still loading, please wait a moment');
    }
};

// Debug function
window.debugApp = function() {
    console.log('=== 🔍 DEBUG INFO ===');
    console.log('App exists:', !!window.app);
    console.log('IDB loaded:', typeof idb !== 'undefined');
    console.log('Chart.js loaded:', typeof Chart !== 'undefined');
    if (window.app) {
        console.log('Database:', window.app.db);
        console.log('Trades:', window.app.trades.length);
        console.log('Portfolio:', {
            startingCapital: window.app.startingCapital,
            currentBalance: window.app.currentBalance
        });
    }
};

console.log('✅ app.js v2.1 loaded successfully');
