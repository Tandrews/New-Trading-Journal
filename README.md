# Options Trading Journal with IndexedDB

A comprehensive web application for tracking and analyzing options trading performance with persistent data storage using IndexedDB.

## Features

### 📊 Dashboard
- Real-time trading metrics (Total P&L, Win Rate, Average Win/Loss)
- Interactive charts with hover tooltips:
  - P&L Over Time (Line Chart)
  - Performance by Strategy (Bar Chart) 
  - Top Tickers (Pie Chart)
  - Monthly P&L (Bar Chart)
- Advanced filtering by ticker, strategy, and date range
- Color-coded P&L (green for profits, red for losses)

### ➕ Add Trade
- Comprehensive trade entry form
- Support for all major options strategies
- Greek values tracking (Delta, Gamma, Theta, Vega)
- Automatic Net P&L calculation
- Form validation and success notifications

### 📁 Import Data
- CSV file upload with drag-and-drop
- Two-step import process: Preview → Commit & Save
- Data validation and error handling
- Support for append or replace modes
- Compatible with most broker export formats

### 📋 Trade History
- Sortable and filterable trade table
- Advanced search functionality
- Bulk operations (select all, delete selected, clear all)
- Individual trade management
- Color-coded P&L display

### 🤖 Chatbot Assistant
- Natural language querying of trade data
- Pre-built example queries
- Instant analysis and insights
- Support for ticker-specific and strategy-based queries

### 📝 Notes & Lessons
- Trading notes with timestamps
- Lessons learned categorization
- Mistake tracking and resolution
- Action items with completion tracking
- Collapsible sections for organization

### 📤 Export & Reports
- CSV export with date range filtering
- JSON backup for complete data export
- Quick export options (Last 30 days, This month, This year)
- PDF report generation (simulated)

## Technology Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Storage**: IndexedDB with idb library wrapper
- **Charts**: Chart.js v4.4.0 
- **CSV Parsing**: PapaParse library
- **Styling**: Custom dark theme CSS
- **Deployment**: GitHub Pages compatible

## Data Persistence

This application uses **IndexedDB** for robust, client-side data storage:

- ✅ Data survives page refreshes and browser restarts
- ✅ Works reliably on static hosting (GitHub Pages, Netlify, etc.)
- ✅ No localStorage cross-origin issues
- ✅ Handles large datasets efficiently (1000+ trades)
- ✅ Three separate object stores: trades, notes, actionItems

## GitHub Pages Deployment

### Quick Setup (5 minutes)

1. **Create GitHub Repository**
   - Go to [GitHub.com](https://github.com) and sign in
   - Click the "+" icon → "New repository"
   - Name it `trading-journal` (or any name you prefer)
   - Make sure it's **Public** (required for free GitHub Pages)
   - Don't initialize with README
   - Click "Create repository"

2. **Upload Files**
   - Download this repository as ZIP
   - Extract the files: `index.html`, `app.js`, `style.css`, `README.md`
   - In your GitHub repository, click "Add file" → "Upload files"
   - Drag and drop all 4 files into the upload area
   - Scroll down and click "Commit changes"

3. **Enable GitHub Pages**
   - In your repository, click the "Settings" tab
   - Scroll down and click "Pages" in the left sidebar
   - Under "Source", select:
     - Branch: `main` (or `master`)
     - Folder: `/ (root)`
   - Click "Save"

4. **Access Your Site**
   - Wait 1-2 minutes for GitHub to build and deploy
   - Refresh the Pages settings page
   - You'll see: "Your site is published at https://yourusername.github.io/trading-journal/"
   - Click the URL to access your trading journal!

### Your Site URL
- **Project site**: `https://yourusername.github.io/trading-journal/`
- **Personal site** (if repo named `yourusername.github.io`): `https://yourusername.github.io/`

### Updating Your Site
After initial deployment, any changes automatically redeploy:
1. Edit files on GitHub (click pencil icon)
2. Commit changes
3. Wait 1-2 minutes for automatic redeploy

## File Structure

```
trading-journal/
├── index.html          # Main application file
├── app.js              # JavaScript logic with IndexedDB
├── style.css           # Dark theme styling
└── README.md           # This file (deployment instructions)
```

## External Dependencies (CDN)

The application automatically loads these libraries from CDN:
- **idb v7**: IndexedDB wrapper - `https://cdn.jsdelivr.net/npm/idb@7/build/umd.js`
- **Chart.js v4.4.0**: Charts - `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js`
- **PapaParse v5.4.1**: CSV parsing - `https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js`

## Browser Support

- ✅ Chrome 58+
- ✅ Firefox 55+
- ✅ Safari 10+
- ✅ Edge 16+

(IndexedDB is required - all modern browsers supported)

## Data Import Format

For CSV imports, use this column structure:
```
Date,Ticker,Strategy,Entry_Price,Exit_Price,Strike,Premium,Quantity,Expiration,Option_Type,Delta,Gamma,Theta,Vega,Fees,Net_PL,Outcome,Trade_Notes,Decision_Rationale
```

**Required columns**: `Date`, `Ticker`, `Strategy`, `Premium`, `Net_PL`, `Outcome`

**Supported date formats**: `YYYY-MM-DD`, `MM/DD/YYYY`

**Supported outcomes**: `Win`, `Loss`, `WIN`, `LOSS`

## Usage Tips

### Data Persistence
- All data is stored locally in your browser's IndexedDB
- Data survives page refreshes, browser restarts, and navigation
- Export regular CSV backups for additional safety
- Use JSON export for complete backup including notes

### Performance
- App handles 1000+ trades efficiently
- Charts update in real-time as you add/modify trades
- Search and filtering work instantly
- No performance issues with large datasets

### Mobile Support
- Fully responsive design works on tablets and phones
- Touch-friendly interface
- All features available on mobile devices

## Troubleshooting

### Site Not Loading
- Wait 2-3 minutes after enabling GitHub Pages
- Verify repository is **Public** (Settings → General → Danger Zone)
- Check that `index.html` is in the root directory
- Ensure Pages source is set to `main` branch, `/ (root)` folder

### Data Not Saving
- IndexedDB requires modern browser (Chrome 58+, Firefox 55+, etc.)
- Check browser console (F12) for any JavaScript errors
- Try different browser if issues persist
- Disable browser extensions that might block storage

### Charts Not Displaying
- Refresh the page if charts appear blank
- Check browser console for Chart.js loading errors
- Ensure stable internet connection for CDN libraries

### Import Issues
- Verify CSV file has required columns: Date, Ticker, Strategy, Net_PL, Outcome
- Check date format is MM/DD/YYYY or YYYY-MM-DD
- Ensure Outcome column contains "Win" or "Loss" values
- Remove any special characters from numeric fields

## Development

### Local Development
1. Clone or download this repository
2. Open `index.html` in a modern web browser
3. No build process required - it's a static web application

### Customization
- Modify `style.css` for visual changes
- Update `app.js` for functionality changes  
- All colors, fonts, and layouts can be customized
- Add new chart types or metrics as needed

## Security & Privacy

- All data stored locally in your browser
- No data transmitted to external servers
- No tracking or analytics
- Complete privacy and control over your trading data

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console (F12) for error messages
3. Ensure you're using a supported browser version
4. Verify all required CSV columns are present for imports

## License

This project is open source and available under the MIT License.

---

**Happy Trading!** 📈

Your options trading journal is now ready to track and analyze your trading performance with persistent IndexedDB storage.
