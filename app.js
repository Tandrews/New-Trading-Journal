// =============================================================================
// COMPLETE Trading Journal app.js v2.4 - WITH VIEW DETAILS
// =============================================================================
// ✅ Proper CSV parsing - imports all 112 trades
// ✅ Portfolio tracking with auto-updates
// ✅ All 5 interactive charts
// ✅ Trade History table with filters
// ✅ ADD TRADE functionality
// ✅ EDIT TRADE functionality
// ✅ VIEW DETAILS modal ← NEW!
// ✅ Delete trades functionality
// ✅ Comprehensive error logging
// =============================================================================

console.log('🚀 Loading Trading Journal v2.4 - With View Details...');

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
        this.currentEditId = null;
        
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
                        const tradesStore = db.createObjectStore('trades', {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        tradesStore.createIndex('date', 'date');
                        tradesStore.createIndex('ticker', 'ticker');
                        tradesStore.createIndex('strategy', 'strategy');
                    }
                    
                    if (!db.objectStoreNames.contains('portfolioSettings')) {
                        db.createObjectStore('portfolioSettings', { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains('portfolioHistory')) {
                        const historyStore = db.createObjectStore('portfolioHistory', {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        historyStore.createIndex('date', 'date');
                    }
                }
            });
            
            console.log('✅ Database opened successfully');
            
        } catch (error) {
            console.error('❌ Database initialization failed:', error);
            throw error;
        }
    }

    async loadAllData() {
        try {
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
            const settings = await this.db.get('portfolioSettings', 'main');
            if (settings) {
                this.startingCapital = settings.startingCapital || 0;
                this.currentBalance = settings.currentBalance || 0;
            }
            this.portfolioHistory = await this.db.getAll('portfolioHistory') || [];
            this.portfolioHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
        } catch (error) {
            console.error('❌ Error loading portfolio:', error);
        }
    }

    async savePortfolioSettings() {
        try {
            const settings = {
                id: 'main',
                startingCapital: this.startingCapital,
                currentBalance: this.currentBalance,
                lastUpdated: new Date().toISOString()
            };
            await this.db.put('portfolioSettings', settings);
            return true;
        } catch (error) {
            console.error('❌ Error saving portfolio settings:', error);
            return false;
        }
    }

    setupEventListeners() {
        console.log('🎯 Setting up event listeners...');
        
        try {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.showTab(e.target.dataset.tab);
                });
            });
            
            const addTradeForm = document.getElementById('add-trade-form');
            if (addTradeForm) {
                addTradeForm.addEventListener('submit', (e) => this.handleAddTrade(e));
            }
            
            const editTradeForm = document.getElementById('edit-trade-form');
            if (editTradeForm) {
                editTradeForm.addEventListener('submit', (e) => this.handleEditTrade(e));
            }
            
            const portfolioForm = document.getElementById('portfolio-settings-form');
            if (portfolioForm) {
                portfolioForm.addEventListener('submit', (e) => this.handlePortfolioSettings(e));
            }
            
            const fileUpload = document.getElementById('csv-file');
            if (fileUpload) {
                fileUpload.addEventListener('change', (e) => this.handleFileUpload(e));
            }
            
            const commitBtn = document.getElementById('commit-import');
            if (commitBtn) {
                commitBtn.addEventListener('click', () => this.commitImport());
            }
            
            ['filter-ticker', 'filter-strategy', 'filter-date-from', 'filter-date-to'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', () => this.applyFilters());
            });

            const resetFilters = document.getElementById('reset-filters');
            if (resetFilters) {
                resetFilters.addEventListener('click', () => this.resetFilters());
            }
            
            console.log('✅ All event listeners set up');
            
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }

 // QUICK PATCH - Replace the viewTradeDetails function in your app.js
// Find the viewTradeDetails function (around line 205-340) and replace it with this:

async viewTradeDetails(id) {
    console.log('👁️ Opening view details modal for trade:', id);
    
    try {
        const trade = await this.db.get('trades', id);
        if (!trade) {
            this.showMessage('error', 'Trade not found');
            return;
        }
        
        console.log('Trade details:', trade);
        
        // Helper function to safely format numbers
        const safeNumber = (value, decimals = 4) => {
            if (!value || value === '' || value === 'N/A') return 'N/A';
            const num = parseFloat(value);
            return !isNaN(num) ? num.toFixed(decimals) : 'N/A';
        };
        
        const content = `
            <div class="trade-details-grid">
                <div class="detail-section">
                    <h3>📊 Basic Information</h3>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span>
                        <span class="detail-value">${new Date(trade.date).toLocaleDateString()}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Ticker:</span>
                        <span class="detail-value">${trade.ticker || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Strategy:</span>
                        <span class="detail-value">${trade.strategy || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Option Type:</span>
                        <span class="detail-value">${trade.option_type || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Strike:</span>
                        <span class="detail-value">${trade.strike || 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Expiration:</span>
                        <span class="detail-value">${trade.expiration ? new Date(trade.expiration).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Quantity:</span>
                        <span class="detail-value">${trade.quantity || 'N/A'}</span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>💰 Pricing & P&L</h3>
                    <div class="detail-item">
                        <span class="detail-label">Entry Price:</span>
                        <span class="detail-value">${trade.entry_price ? this.formatCurrency(trade.entry_price) : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Exit Price:</span>
                        <span class="detail-value">${trade.exit_price ? this.formatCurrency(trade.exit_price) : 'N/A'}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Premium:</span>
                        <span class="detail-value">${this.formatCurrency(trade.premium || 0)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Fees:</span>
                        <span class="detail-value">${this.formatCurrency(trade.fees || 0)}</span>
                    </div>
                    <div class="detail-item highlight">
                        <span class="detail-label"><strong>Net P&L:</strong></span>
                        <span class="detail-value ${(trade.net_pl || 0) >= 0 ? 'positive' : 'negative'}">
                            <strong>${this.formatCurrency(trade.net_pl || 0)}</strong>
                        </span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Outcome:</span>
                        <span class="detail-value outcome-${(trade.outcome || 'loss').toLowerCase()}">
                            ${trade.outcome || 'Loss'}
                        </span>
                    </div>
                </div>

                <div class="detail-section">
                    <h3>📈 Greeks</h3>
                    <div class="detail-item">
                        <span class="detail-label">Delta (Δ):</span>
                        <span class="detail-value">${safeNumber(trade.delta)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Gamma (Γ):</span>
                        <span class="detail-value">${safeNumber(trade.gamma)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Theta (Θ):</span>
                        <span class="detail-value">${safeNumber(trade.theta)}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Vega (ν):</span>
                        <span class="detail-value">${safeNumber(trade.vega)}</span>
                    </div>
                </div>

                ${trade.trade_notes ? `
                <div class="detail-section notes-section">
                    <h3>📝 Trade Notes</h3>
                    <div class="trade-notes-display">
                        ${trade.trade_notes}
                    </div>
                </div>
                ` : ''}

                <div class="detail-section">
                    <h3>🕐 Timestamps</h3>
                    <div class="detail-item">
                        <span class="detail-label">Created:</span>
                        <span class="detail-value">${trade.created_at ? new Date(trade.created_at).toLocaleString() : 'N/A'}</span>
                    </div>
                    ${trade.updated_at ? `
                    <div class="detail-item">
                        <span class="detail-label">Last Updated:</span>
                        <span class="detail-value">${new Date(trade.updated_at).toLocaleString()}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.getElementById('view-details-content').innerHTML = content;
        document.getElementById('view-trade-modal').style.display = 'flex';
        
        console.log('✅ View details modal opened');
        
    } catch (error) {
        console.error('❌ Error loading trade details:', error);
        this.showMessage('error', 'Failed to load trade details: ' + error.message);
    }
}
    // ============================================================================
    // ADD TRADE
    // ============================================================================
    
    async handleAddTrade(e) {
        e.preventDefault();
        console.log('➕ Processing new trade...');
        
        try {
            const formData = new FormData(e.target);
            
            const trade = {
                date: formData.get('trade-date'),
                ticker: formData.get('ticker')?.toUpperCase(),
                strategy: formData.get('strategy'),
                option_type: formData.get('option-type'),
                strike: formData.get('strike'),
                expiration: formData.get('expiration'),
                quantity: parseInt(formData.get('quantity')) || 1,
                entry_price: parseFloat(formData.get('entry-price')) || null,
                exit_price: parseFloat(formData.get('exit-price')) || null,
                premium: parseFloat(formData.get('premium')) || 0,
                fees: parseFloat(formData.get('fees')) || 0,
                delta: parseFloat(formData.get('delta')) || null,
                gamma: parseFloat(formData.get('gamma')) || null,
                theta: parseFloat(formData.get('theta')) || null,
                vega: parseFloat(formData.get('vega')) || null,
                trade_notes: formData.get('trade-notes'),
                created_at: new Date().toISOString()
            };
            
            trade.net_pl = trade.premium + trade.fees;
            trade.outcome = trade.net_pl >= 0 ? 'Win' : 'Loss';
            
            if (!trade.date || !trade.ticker || !trade.strategy) {
                this.showMessage('error', 'Please fill in all required fields');
                return;
            }
            
            const id = await this.db.add('trades', trade);
            trade.id = id;
            
            this.trades.unshift(trade);
            this.filteredTrades = [...this.trades];
            
            this.currentBalance += trade.net_pl;
            await this.savePortfolioSettings();
            
            this.populateFilterDropdowns();
            await this.updateDashboard();
            if (this.currentTab === 'history') {
                this.updateTradeHistory();
            }
            
            e.target.reset();
            this.showMessage('success', `Trade added! P&L: ${this.formatCurrency(trade.net_pl)}`);
            
        } catch (error) {
            console.error('❌ Error adding trade:', error);
            this.showMessage('error', 'Failed to add trade');
        }
    }

    // ============================================================================
    // EDIT TRADE
    // ============================================================================
    
    async editTrade(id) {
        console.log('✏️ Opening edit modal for trade:', id);
        
        try {
            const trade = await this.db.get('trades', id);
            if (!trade) {
                this.showMessage('error', 'Trade not found');
                return;
            }
            
            this.currentEditId = id;
            
            document.getElementById('edit-trade-id').value = id;
            document.getElementById('edit-trade-date').value = trade.date || '';
            document.getElementById('edit-ticker').value = trade.ticker || '';
            document.getElementById('edit-strategy').value = trade.strategy || '';
            document.getElementById('edit-option-type').value = trade.option_type || 'CALL';
            document.getElementById('edit-strike').value = trade.strike || '';
            document.getElementById('edit-expiration').value = trade.expiration || '';
            document.getElementById('edit-quantity').value = trade.quantity || 1;
            document.getElementById('edit-entry-price').value = trade.entry_price || '';
            document.getElementById('edit-exit-price').value = trade.exit_price || '';
            document.getElementById('edit-premium').value = trade.premium || 0;
            document.getElementById('edit-fees').value = trade.fees || 0;
            document.getElementById('edit-delta').value = trade.delta || '';
            document.getElementById('edit-gamma').value = trade.gamma || '';
            document.getElementById('edit-theta').value = trade.theta || '';
            document.getElementById('edit-vega').value = trade.vega || '';
            document.getElementById('edit-trade-notes').value = trade.trade_notes || '';
            
            this.openEditModal();
            
        } catch (error) {
            console.error('❌ Error loading trade for edit:', error);
            this.showMessage('error', 'Failed to load trade');
        }
    }
    
    openEditModal() {
        document.getElementById('edit-trade-modal').style.display = 'flex';
    }
    
    closeEditModal() {
        document.getElementById('edit-trade-modal').style.display = 'none';
        this.currentEditId = null;
    }
    
    async handleEditTrade(e) {
        e.preventDefault();
        
        try {
            const id = parseInt(document.getElementById('edit-trade-id').value);
            const originalTrade = await this.db.get('trades', id);
            const originalPL = originalTrade ? (originalTrade.net_pl || 0) : 0;
            
            const updatedTrade = {
                id: id,
                date: document.getElementById('edit-trade-date').value,
                ticker: document.getElementById('edit-ticker').value?.toUpperCase(),
                strategy: document.getElementById('edit-strategy').value,
                option_type: document.getElementById('edit-option-type').value,
                strike: document.getElementById('edit-strike').value,
                expiration: document.getElementById('edit-expiration').value,
                quantity: parseInt(document.getElementById('edit-quantity').value) || 1,
                entry_price: parseFloat(document.getElementById('edit-entry-price').value) || null,
                exit_price: parseFloat(document.getElementById('edit-exit-price').value) || null,
                premium: parseFloat(document.getElementById('edit-premium').value) || 0,
                fees: parseFloat(document.getElementById('edit-fees').value) || 0,
                delta: parseFloat(document.getElementById('edit-delta').value) || null,
                gamma: parseFloat(document.getElementById('edit-gamma').value) || null,
                theta: parseFloat(document.getElementById('edit-theta').value) || null,
                vega: parseFloat(document.getElementById('edit-vega').value) || null,
                trade_notes: document.getElementById('edit-trade-notes').value,
                updated_at: new Date().toISOString(),
                created_at: originalTrade.created_at
            };
            
            updatedTrade.net_pl = updatedTrade.premium + updatedTrade.fees;
            updatedTrade.outcome = updatedTrade.net_pl >= 0 ? 'Win' : 'Loss';
            
            await this.db.put('trades', updatedTrade);
            
            const plDifference = updatedTrade.net_pl - originalPL;
            this.currentBalance += plDifference;
            await this.savePortfolioSettings();
            
            const index = this.trades.findIndex(t => t.id === id);
            if (index !== -1) this.trades[index] = updatedTrade;
            const filteredIndex = this.filteredTrades.findIndex(t => t.id === id);
            if (filteredIndex !== -1) this.filteredTrades[filteredIndex] = updatedTrade;
            
            this.closeEditModal();
            this.populateFilterDropdowns();
            this.updateTradeHistory();
            await this.updateDashboard();
            
            this.showMessage('success', `Trade updated! Portfolio adjusted by ${this.formatCurrency(plDifference)}`);
            
        } catch (error) {
            console.error('❌ Error updating trade:', error);
            this.showMessage('error', 'Failed to update trade');
        }
    }

    // ============================================================================
    // PORTFOLIO SETTINGS
    // ============================================================================

    async handlePortfolioSettings(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const newStartingCapital = parseFloat(formData.get('starting-capital')) || 0;
            const newCurrentBalance = parseFloat(formData.get('current-balance')) || 0;
            
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
                this.showMessage('success', `Portfolio settings saved!`);
            }
            
        } catch (error) {
            console.error('❌ Error handling portfolio settings:', error);
            this.showMessage('error', 'Error: ' + error.message);
        }
    }

    // ============================================================================
    // CSV IMPORT (keeping from v2.3 - no changes)
    // ============================================================================

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                this.parseCSV(event.target.result);
            } catch (error) {
                console.error('❌ Error reading file:', error);
                this.showMessage('error', 'Error reading file');
            }
        };
        reader.readAsText(file);
    }

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
            const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
            if (lines.length < 2) {
                this.showMessage('error', 'CSV file must have header and data rows');
                return;
            }
            
            const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
            const trades = [];
            let skipped = 0;
            
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                
                if (values.length < headers.length) {
                    while (values.length < headers.length) {
                        values.push('');
                    }
                }
                
                const trade = {};
                headers.forEach((header, index) => {
                    trade[header] = values[index] || '';
                });
                
                if (!trade.date || !trade.ticker) {
                    skipped++;
                    continue;
                }
                
                trade.net_pl = parseFloat(trade.net_pl || trade.net_p_l || 0);
                trade.premium = parseFloat(trade.premium || 0);
                trade.fees = parseFloat(trade.fees || -0.65);
                trade.quantity = parseInt(trade.quantity || 1);
                trade.entry_price = trade.entry_price ? parseFloat(trade.entry_price) : null;
                trade.exit_price = trade.exit_price ? parseFloat(trade.exit_price) : null;
                
                trade.ticker = trade.ticker.toUpperCase();
                trade.strategy = trade.strategy || 'Unknown';
                trade.outcome = trade.outcome || ((trade.net_pl >= 0) ? 'Win' : 'Loss');
                trade.created_at = new Date().toISOString();
                
                trades.push(trade);
            }
            
            console.log(`✅ Parsed ${trades.length} trades (skipped ${skipped})`);
            
            if (trades.length === 0) {
                this.showMessage('error', 'No valid trades found');
                return;
            }
            
            this.previewData = trades;
            this.displayPreview(trades);
            this.showMessage('success', `Loaded ${trades.length} trades for preview`, 'import-message');
            
        } catch (error) {
            console.error('❌ Error parsing CSV:', error);
            this.showMessage('error', 'Error parsing CSV');
        }
    }

    displayPreview(trades) {
        const previewSection = document.getElementById('preview-section');
        const previewTable = document.getElementById('preview-table');
        
        if (!previewSection || !previewTable) return;
        
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
                    ${trades.length > 20 ? `<tr><td colspan="5">... and ${trades.length - 20} more</td></tr>` : ''}
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
    }

    async commitImport() {
        if (!this.previewData || this.previewData.length === 0) {
            this.showMessage('error', 'No data to import', 'import-message');
            return;
        }
        
        try {
            const mode = document.querySelector('input[name="import-mode"]:checked')?.value || 'append';
            
            if (mode === 'replace') {
                if (!confirm(`Delete all trades and import ${this.previewData.length} new ones?`)) return;
                await this.db.clear('trades');
                this.trades = [];
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
            
            this.currentBalance += totalPL;
            await this.savePortfolioSettings();
            
            this.trades.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.filteredTrades = [...this.trades];
            this.populateFilterDropdowns();
            await this.updateDashboard();
            
            const previewStatus = document.getElementById('preview-status');
            if (previewStatus) {
                previewStatus.textContent = 'Data Committed Successfully ✅';
                previewStatus.style.color = '#00ff88';
            }
            
            this.showMessage('success', `✅ Imported ${successCount} trades! P&L: ${this.formatCurrency(totalPL)}`, 'import-message');
            this.previewData = null;
            
        } catch (error) {
            console.error('❌ Import failed:', error);
            this.showMessage('error', 'Import failed', 'import-message');
        }
    }
// =============================================================================
// FEATURE 1: EXPORT TO CSV
// =============================================================================
// Add these functions to your TradingJournal class in app.js
// Place them after the commitImport() function
// =============================================================================

    // Export trades to CSV
    exportToCSV() {
        console.log('📥 Exporting trades to CSV...');
        
        if (this.trades.length === 0) {
            this.showMessage('error', 'No trades to export');
            return;
        }
        
        try {
            // CSV Headers
            const headers = [
                'Date', 'Ticker', 'Strategy', 'Option Type', 'Strike', 'Expiration',
                'Quantity', 'Entry Price', 'Exit Price', 'Premium', 'Fees', 'Net P&L',
                'Outcome', 'Delta', 'Gamma', 'Theta', 'Vega', 
                'Trade Notes', 'Post-Trade Analysis', 'Created At'
            ];
            
            // Build CSV content
            let csvContent = headers.join(',') + '\n';
            
            this.trades.forEach(trade => {
                const row = [
                    trade.date || '',
                    trade.ticker || '',
                    trade.strategy || '',
                    trade.option_type || '',
                    trade.strike || '',
                    trade.expiration || '',
                    trade.quantity || '',
                    trade.entry_price || '',
                    trade.exit_price || '',
                    trade.premium || 0,
                    trade.fees || 0,
                    trade.net_pl || 0,
                    trade.outcome || '',
                    trade.delta || '',
                    trade.gamma || '',
                    trade.theta || '',
                    trade.vega || '',
                    `"${(trade.trade_notes || '').replace(/"/g, '""')}"`, // Escape quotes
                    `"${(trade.post_trade_analysis || '').replace(/"/g, '""')}"`, // Escape quotes
                    trade.created_at || ''
                ];
                csvContent += row.join(',') + '\n';
            });
            
            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `trading-journal-${timestamp}.csv`;
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showMessage('success', `Exported ${this.trades.length} trades to ${filename}`);
            console.log(`✅ Exported ${this.trades.length} trades`);
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showMessage('error', 'Export failed: ' + error.message);
        }
    }


    // ============================================================================
    // NAVIGATION & UI
    // ============================================================================

    showTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const selectedContent = document.getElementById(`${tabName}-tab`);
        if (selectedContent) selectedContent.classList.add('active');
        
        const selectedBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (selectedBtn) selectedBtn.classList.add('active');
        
        this.currentTab = tabName;
        
        if (tabName === 'dashboard') {
            this.updateDashboard();
        } else if (tabName === 'history') {
            this.updateTradeHistory();
            this.populateFilterDropdowns();
        }
    }

    async updateDashboard() {
        this.calculateMetrics();
        this.calculatePortfolioMetrics();
        this.displayMetrics();
        this.displayPortfolioMetrics();
        await this.updateCharts();
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
            if (element) element.textContent = value;
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

    // ============================================================================
    // TRADE HISTORY
    // ============================================================================

    updateTradeHistory() {
        const tbody = document.querySelector('#trades-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.filteredTrades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; color: #999; padding: 2rem;">No trades found.</td></tr>';
            return;
        }
        
        this.filteredTrades.forEach(trade => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><input type="checkbox" class="trade-checkbox" data-id="${trade.id}"></td>
                <td>${new Date(trade.date).toLocaleDateString()}</td>
                <td>${trade.ticker || ''}</td>
                <td>${trade.strategy || 'Unknown'}</td>
                <td>${trade.option_type || 'N/A'}</td>
                <td>${trade.strike || 'N/A'}</td>
                <td>${trade.entry_price ? this.formatCurrency(trade.entry_price) : 'N/A'}</td>
                <td>${trade.exit_price ? this.formatCurrency(trade.exit_price) : 'N/A'}</td>
                <td>${this.formatCurrency(trade.premium || 0)}</td>
                <td class="${(trade.net_pl || 0) >= 0 ? 'positive' : 'negative'}">
                    ${this.formatCurrency(trade.net_pl || 0)}
                </td>
                <td>
                    <span class="outcome-${(trade.outcome || 'loss').toLowerCase()}">
                        ${trade.outcome || 'Loss'}
                    </span>
                </td>
                <td class="action-buttons">
                    <button class="btn btn-info btn-sm" onclick="app.viewTradeDetails(${trade.id})" title="View details">👁️</button>
                    <button class="btn btn-primary btn-sm" onclick="app.editTrade(${trade.id})" title="Edit trade">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="app.deleteTrade(${trade.id})" title="Delete trade">🗑️</button>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        const tableInfo = document.getElementById('table-info');
        if (tableInfo) {
            tableInfo.textContent = `Showing ${this.filteredTrades.length} of ${this.trades.length} trades`;
        }
    }

    populateFilterDropdowns() {
        const tickers = [...new Set(this.trades.map(t => t.ticker))].sort();
        const tickerSelect = document.getElementById('filter-ticker');
        if (tickerSelect) {
            tickerSelect.innerHTML = '<option value="">All Tickers</option>';
            tickers.forEach(ticker => {
                const option = document.createElement('option');
                option.value = ticker;
                option.textContent = ticker;
                tickerSelect.appendChild(option);
            });
        }
        
        const strategies = [...new Set(this.trades.map(t => t.strategy || 'Unknown'))].sort();
        const strategySelect = document.getElementById('filter-strategy');
        if (strategySelect) {
            strategySelect.innerHTML = '<option value="">All Strategies</option>';
            strategies.forEach(strategy => {
                const option = document.createElement('option');
                option.value = strategy;
                option.textContent = strategy;
                strategySelect.appendChild(option);
            });
        }
    }

    applyFilters() {
        const tickerFilter = document.getElementById('filter-ticker')?.value;
        const strategyFilter = document.getElementById('filter-strategy')?.value;
        const dateFrom = document.getElementById('filter-date-from')?.value;
        const dateTo = document.getElementById('filter-date-to')?.value;
        
        this.filteredTrades = this.trades.filter(trade => {
            if (tickerFilter && trade.ticker !== tickerFilter) return false;
            if (strategyFilter && trade.strategy !== strategyFilter) return false;
            
            if (dateFrom) {
                const tradeDate = new Date(trade.date);
                const fromDate = new Date(dateFrom);
                if (tradeDate < fromDate) return false;
            }
            
            if (dateTo) {
                const tradeDate = new Date(trade.date);
                const toDate = new Date(dateTo);
                if (tradeDate > toDate) return false;
            }
            
            return true;
        });
        
        this.updateTradeHistory();
        this.updateDashboard();
    }

    resetFilters() {
        const filterTicker = document.getElementById('filter-ticker');
        const filterStrategy = document.getElementById('filter-strategy');
        const filterDateFrom = document.getElementById('filter-date-from');
        const filterDateTo = document.getElementById('filter-date-to');
        
        if (filterTicker) filterTicker.value = '';
        if (filterStrategy) filterStrategy.value = '';
        if (filterDateFrom) filterDateFrom.value = '';
        if (filterDateTo) filterDateTo.value = '';
        
        this.filteredTrades = [...this.trades];
        this.updateTradeHistory();
        this.updateDashboard();
    }

    async deleteTrade(id) {
        if (!confirm('Delete this trade?')) return;
        
        try {
            const trade = await this.db.get('trades', id);
            if (trade) {
                this.currentBalance -= (trade.net_pl || 0);
                await this.savePortfolioSettings();
            }
            
            await this.db.delete('trades', id);
            
            this.trades = this.trades.filter(t => t.id !== id);
            this.filteredTrades = this.filteredTrades.filter(t => t.id !== id);
            
            this.updateTradeHistory();
            await this.updateDashboard();
            this.populateFilterDropdowns();
            
            this.showMessage('success', 'Trade deleted');
            
        } catch (error) {
            console.error('❌ Error deleting trade:', error);
            this.showMessage('error', 'Failed to delete trade');
        }
    }

    // ============================================================================
    // CHARTS (keeping from v2.3 - no changes needed)
    // ============================================================================

    async updateCharts() {
        if (typeof Chart === 'undefined') return;
        
        try {
            this.createPLChart();
            this.createPortfolioBalanceChart();
            this.createStrategyChart();
            this.createTopTickersChart();
            this.createMonthlyPLChart();
        } catch (error) {
            console.error('❌ Error creating charts:', error);
        }
    }

    createPLChart() {
        const ctx = document.getElementById('pl-over-time');
        if (!ctx) return;
        
        if (this.charts.plOverTime) this.charts.plOverTime.destroy();
        
        if (this.filteredTrades.length === 0) {
            ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">No trade data yet.</p>';
            return;
        }
        
        const sortedTrades = [...this.filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let cumulative = 0;
        const data = sortedTrades.map(trade => {
            cumulative += trade.net_pl || 0;
            return { x: new Date(trade.date), y: cumulative };
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
        
        if (this.charts.portfolioBalance) this.charts.portfolioBalance.destroy();
        
        if (this.filteredTrades.length === 0 || this.startingCapital === 0) {
            ctx.parentElement.innerHTML = '<p style="text-align: center; color: #999; padding: 2rem;">Set portfolio settings and add trades.</p>';
            return;
        }
        
        const sortedTrades = [...this.filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
        let balance = this.startingCapital;
        const data = [{ x: sortedTrades[0] ? new Date(sortedTrades[0].date) : new Date(), y: this.startingCapital }];
        
        sortedTrades.forEach(trade => {
            balance += trade.net_pl || 0;
            data.push({ x: new Date(trade.date), y: balance });
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
        
        if (this.charts.strategyPerformance) this.charts.strategyPerformance.destroy();
        if (this.filteredTrades.length === 0) return;
        
        const strategyData = {};
        this.filteredTrades.forEach(trade => {
            const strategy = trade.strategy || 'Unknown';
            if (!strategyData[strategy]) strategyData[strategy] = 0;
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
        
        if (this.charts.topTickers) this.charts.topTickers.destroy();
        if (this.filteredTrades.length === 0) return;
        
        const tickerData = {};
        this.filteredTrades.forEach(trade => {
            const ticker = trade.ticker || 'Unknown';
            if (!tickerData[ticker]) tickerData[ticker] = 0;
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
        
        if (this.charts.monthlyPL) this.charts.monthlyPL.destroy();
        if (this.filteredTrades.length === 0) return;
        
        const monthlyData = {};
        this.filteredTrades.forEach(trade => {
            const date = new Date(trade.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthlyData[monthKey]) monthlyData[monthKey] = 0;
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

    // ============================================================================
    // MODALS & UTILITIES
    // ============================================================================

    openPortfolioModal() {
        document.getElementById('starting-capital').value = this.startingCapital;
        document.getElementById('current-balance').value = this.currentBalance;
        document.getElementById('portfolio-settings-modal').style.display = 'flex';
    }

    closePortfolioModal() {
        document.getElementById('portfolio-settings-modal').style.display = 'none';
    }

    showMessage(type, message, containerId = null) {
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
            color: ${type === 'success' ? '#000' : '#fff'};
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
            if (messageEl.parentNode) messageEl.parentNode.removeChild(messageEl);
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

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    window.app = new TradingJournal();
    window.app.init().catch(error => {
        console.error('💥 Failed to initialize:', error);
        alert('Failed to initialize Trading Journal. Check console (F12).');
    });
});

window.openPortfolioSettings = function() {
    if (window.app) {
        window.app.openPortfolioModal();
    } else {
        alert('App is still loading...');
    }
};

window.app = window.app || {};

window.debugApp = function() {
    console.log('=== 🔍 DEBUG INFO ===');
    console.log('App exists:', !!window.app);
    console.log('IDB loaded:', typeof idb !== 'undefined');
    console.log('Chart.js loaded:', typeof Chart !== 'undefined');
    if (window.app) {
        console.log('Trades:', window.app.trades.length);
        console.log('Portfolio:', {
            startingCapital: window.app.startingCapital,
            currentBalance: window.app.currentBalance
        });
    }
};
// Global function for View Details modal
window.closeViewModal = function() {
    if (window.app) {
        window.app.closeViewModal();
    }
};

console.log('✅ View modal close function added');

console.log('✅ app.js v2.4 loaded - Complete with View Details');
