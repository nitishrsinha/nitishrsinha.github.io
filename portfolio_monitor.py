#!/usr/bin/env python3
"""
AI Shocks Portfolio Monitor

This script creates a value-weighted portfolio from a list of AI/tech stocks,
monitoring daily returns and tracking any ticker/company name changes.

The portfolio is weighted using market capitalization from October 25, 2022.
"""

import pandas as pd
import numpy as np
import yfinance as yf
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import warnings
from datetime import datetime, timedelta
import os

warnings.filterwarnings('ignore')

class PortfolioMonitor:
    def __init__(self, ticker_file='tickerlist.txt', base_date='2022-10-25'):
        """
        Initialize the Portfolio Monitor
        
        Args:
            ticker_file (str): Path to ticker list file
            base_date (str): Date to use for market cap weights (YYYY-MM-DD)
        """
        self.ticker_file = ticker_file
        self.base_date = base_date
        self.tickers_df = None
        self.market_caps = {}
        self.weights = {}
        self.portfolio_data = None
        self.ticker_changes = []
        
    def load_ticker_list(self):
        """Load ticker symbols and company names from file"""
        print(f"Loading ticker list from {self.ticker_file}...")
        
        try:
            # Read ticker file (tab-separated)
            self.tickers_df = pd.read_csv(
                self.ticker_file, 
                sep='\t', 
                names=['ticker', 'company_name'],
                dtype=str
            )
            
            # Clean whitespace
            self.tickers_df['ticker'] = self.tickers_df['ticker'].str.strip()
            self.tickers_df['company_name'] = self.tickers_df['company_name'].str.strip()
            
            print(f"Successfully loaded {len(self.tickers_df)} tickers")
            return True
            
        except Exception as e:
            print(f"Error loading ticker list: {e}")
            return False
    
    def get_market_caps_base_date(self):
        """Get market capitalizations for all tickers on the base date"""
        print(f"Fetching market caps for {self.base_date}...")
        
        successful_tickers = []
        
        for idx, row in self.tickers_df.iterrows():
            ticker = row['ticker']
            company = row['company_name']
            
            try:
                # Get stock info
                stock = yf.Ticker(ticker)
                
                # Get historical data around base date
                start_date = pd.to_datetime(self.base_date) - timedelta(days=7)
                end_date = pd.to_datetime(self.base_date) + timedelta(days=7)
                
                hist_data = stock.history(start=start_date, end=end_date)
                
                if hist_data.empty:
                    print(f"  Warning: No data for {ticker} ({company})")
                    continue
                
                # Find the closest date to our base date
                target_date = pd.to_datetime(self.base_date)
                
                # Handle timezone-aware index
                if hist_data.index.tz is not None:
                    # If historical data has timezone, localize target_date
                    target_date = target_date.tz_localize(hist_data.index.tz)
                elif target_date.tz is not None:
                    # If target_date has timezone but hist_data doesn't, remove timezone
                    target_date = target_date.tz_localize(None)
                
                closest_date = hist_data.index[hist_data.index.get_indexer([target_date], method='nearest')[0]]
                
                # Get shares outstanding (use info or approximate from market cap)
                try:
                    info = stock.info
                    shares_outstanding = info.get('sharesOutstanding')
                    if shares_outstanding is None:
                        shares_outstanding = info.get('impliedSharesOutstanding')
                except:
                    shares_outstanding = None
                
                # Calculate market cap
                close_price = hist_data.loc[closest_date, 'Close']
                
                if shares_outstanding:
                    market_cap = close_price * shares_outstanding
                else:
                    # Use a default approximation if shares outstanding not available
                    # This is a fallback - in practice, you'd want actual shares outstanding
                    market_cap = close_price * 1_000_000  # Placeholder
                    print(f"  Warning: Using estimated market cap for {ticker}")
                
                self.market_caps[ticker] = {
                    'market_cap': market_cap,
                    'price': close_price,
                    'date': closest_date,
                    'company_name': company
                }
                
                successful_tickers.append(ticker)
                print(f"  ✓ {ticker}: ${market_cap:,.0f}")
                
            except Exception as e:
                print(f"  Error fetching data for {ticker}: {e}")
                continue
        
        print(f"Successfully retrieved market caps for {len(successful_tickers)} tickers")
        return successful_tickers
    
    def calculate_weights(self):
        """Calculate portfolio weights based on market capitalizations"""
        print("Calculating portfolio weights...")
        
        # Calculate total market cap
        total_market_cap = sum(data['market_cap'] for data in self.market_caps.values())
        
        # Calculate weights
        for ticker, data in self.market_caps.items():
            weight = data['market_cap'] / total_market_cap
            self.weights[ticker] = weight
            print(f"  {ticker}: {weight:.4f} ({weight*100:.2f}%)")
        
        print(f"Total portfolio weight: {sum(self.weights.values()):.4f}")
    
    def fetch_portfolio_data(self, start_date=None, end_date=None):
        """
        Fetch historical price data for all stocks and calculate portfolio returns
        
        Args:
            start_date (str): Start date for data (YYYY-MM-DD)
            end_date (str): End date for data (YYYY-MM-DD)
        """
        if start_date is None:
            start_date = self.base_date
        if end_date is None:
            end_date = datetime.now().strftime('%Y-%m-%d')
            
        print(f"Fetching portfolio data from {start_date} to {end_date}...")
        
        tickers_list = list(self.weights.keys())
        
        # Add SPY for S&P 500 comparison
        all_tickers = tickers_list + ['SPY']
        
        # Download all data at once
        try:
            data = yf.download(all_tickers, start=start_date, end=end_date, progress=False)
            
            if data.empty:
                print("Error: No data downloaded")
                return
            
            # Handle different data structures based on number of tickers
            if len(all_tickers) == 1:
                # Single ticker case - data is a simple DataFrame
                if 'Adj Close' in data.columns:
                    prices = data['Adj Close'].to_frame()
                    prices.columns = all_tickers
                else:
                    prices = data[['Close']].rename(columns={'Close': all_tickers[0]})
            else:
                # Multiple tickers case - data has MultiIndex columns
                if isinstance(data.columns, pd.MultiIndex):
                    if 'Adj Close' in data.columns.get_level_values(0):
                        prices = data['Adj Close']
                    else:
                        prices = data['Close']
                else:
                    # Fallback if structure is unexpected
                    print("Warning: Unexpected data structure, using Close prices")
                    prices = data
            
            # Ensure we have valid price data
            if prices.empty:
                print("Error: No price data available")
                return
                
        except Exception as e:
            print(f"Error downloading data: {e}")
            return
        
        # Calculate daily returns
        returns = prices.pct_change().dropna()
        
        # Calculate portfolio daily returns (weighted)
        portfolio_returns = pd.Series(index=returns.index, dtype=float)
        
        for date in returns.index:
            daily_return = 0
            for ticker in tickers_list:
                if ticker in returns.columns and not pd.isna(returns.loc[date, ticker]):
                    daily_return += self.weights[ticker] * returns.loc[date, ticker]
            portfolio_returns[date] = daily_return
        
        # Calculate cumulative returns
        portfolio_cumulative = (1 + portfolio_returns).cumprod()
        
        # Calculate S&P 500 returns and cumulative performance
        spy_returns = returns['SPY'] if 'SPY' in returns.columns else pd.Series(index=returns.index)
        spy_cumulative = (1 + spy_returns).cumprod()
        
        # Create comprehensive dataset
        self.portfolio_data = pd.DataFrame({
            'date': portfolio_returns.index,
            'daily_return': portfolio_returns.values,
            'cumulative_return': portfolio_cumulative.values,
            'portfolio_value': portfolio_cumulative.values * 100,  # Starting at $100
            'spy_daily_return': spy_returns.values,
            'spy_cumulative_return': spy_cumulative.values,
            'spy_value': spy_cumulative.values * 100  # Starting at $100
        })
        
        # Add individual stock data for analysis - align with portfolio_returns index
        for ticker in tickers_list:
            if ticker in prices.columns:
                # Align stock data with portfolio returns index
                aligned_prices = prices[ticker].reindex(portfolio_returns.index)
                self.portfolio_data[f'{ticker}_price'] = aligned_prices.values
                
                if ticker in returns.columns:
                    aligned_returns = returns[ticker].reindex(portfolio_returns.index)
                    self.portfolio_data[f'{ticker}_return'] = aligned_returns.values
                else:
                    self.portfolio_data[f'{ticker}_return'] = np.nan
        
        print(f"Portfolio data calculated for {len(self.portfolio_data)} trading days")
        
        # Check for ticker changes (simplified check)
        self.check_ticker_changes()
    
    def check_ticker_changes(self):
        """Check for potential ticker or company name changes"""
        print("Checking for ticker/company name changes...")
        
        current_changes = []
        
        for ticker in self.weights.keys():
            try:
                stock = yf.Ticker(ticker)
                current_info = stock.info
                
                original_company = self.market_caps[ticker]['company_name']
                current_company = current_info.get('longName', 'Unknown')
                
                # Simple name change detection (you might want more sophisticated logic)
                if current_company.upper() != original_company.upper():
                    if 'Unknown' not in current_company:
                        change_info = {
                            'ticker': ticker,
                            'original_name': original_company,
                            'current_name': current_company,
                            'change_detected': datetime.now().strftime('%Y-%m-%d')
                        }
                        current_changes.append(change_info)
                        print(f"  ⚠️ Name change detected for {ticker}:")
                        print(f"     Original: {original_company}")
                        print(f"     Current:  {current_company}")
                
            except Exception as e:
                print(f"  Could not check {ticker}: {e}")
                continue
        
        self.ticker_changes.extend(current_changes)
        
        if not current_changes:
            print("  No ticker/company name changes detected")
    
    def save_dataset(self, filename='ai_portfolio_data.csv'):
        """Save portfolio data to CSV file"""
        print(f"Saving portfolio data to {filename}...")
        
        # Add metadata
        metadata_df = pd.DataFrame([
            ['# AI Shocks Portfolio Data'],
            [f'# Generated on: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'],
            [f'# Base date for weights: {self.base_date}'],
            [f'# Number of stocks: {len(self.weights)}'],
            ['# Weights based on market capitalization'],
            ['']
        ])
        
        # Save main data
        self.portfolio_data.to_csv(filename, index=False)
        
        # Save weights separately
        weights_df = pd.DataFrame([
            (ticker, weight, self.market_caps[ticker]['company_name'])
            for ticker, weight in self.weights.items()
        ], columns=['ticker', 'weight', 'company_name'])
        
        weights_filename = filename.replace('.csv', '_weights.csv')
        weights_df.to_csv(weights_filename, index=False)
        
        # Save ticker changes if any
        if self.ticker_changes:
            changes_df = pd.DataFrame(self.ticker_changes)
            changes_filename = filename.replace('.csv', '_changes.csv')
            changes_df.to_csv(changes_filename, index=False)
            print(f"Ticker changes saved to {changes_filename}")
        
        print(f"Dataset saved successfully:")
        print(f"  - Main data: {filename}")
        print(f"  - Weights: {weights_filename}")
    
    def create_interactive_chart(self, html_filename='ai_portfolio_chart.html'):
        """Create interactive plotly chart of portfolio performance"""
        print(f"Creating interactive chart: {html_filename}")
        
        # Create subplots
        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=('Portfolio Cumulative Value', 'Daily Returns'),
            vertical_spacing=0.08,
            row_heights=[0.7, 0.3]
        )
        
        # Portfolio value line
        fig.add_trace(
            go.Scatter(
                x=self.portfolio_data['date'],
                y=self.portfolio_data['portfolio_value'],
                mode='lines',
                name='AI Portfolio',
                line=dict(color='#2E86AB', width=3),
                hovertemplate='<b>Date:</b> %{x}<br>' +
                              '<b>AI Portfolio:</b> $%{y:.2f}<br>' +
                              '<extra></extra>'
            ),
            row=1, col=1
        )
        
        # S&P 500 comparison line
        fig.add_trace(
            go.Scatter(
                x=self.portfolio_data['date'],
                y=self.portfolio_data['spy_value'],
                mode='lines',
                name='S&P 500 (SPY)',
                line=dict(color='#FF6B35', width=2, dash='dash'),
                hovertemplate='<b>Date:</b> %{x}<br>' +
                              '<b>S&P 500:</b> $%{y:.2f}<br>' +
                              '<extra></extra>'
            ),
            row=1, col=1
        )
        
        # Daily returns
        colors = ['green' if x >= 0 else 'red' for x in self.portfolio_data['daily_return']]
        fig.add_trace(
            go.Bar(
                x=self.portfolio_data['date'],
                y=self.portfolio_data['daily_return'] * 100,  # Convert to percentage
                name='Daily Return (%)',
                marker_color=colors,
                hovertemplate='<b>Date:</b> %{x}<br>' +
                              '<b>Daily Return:</b> %{y:.2f}%<br>' +
                              '<extra></extra>'
            ),
            row=2, col=1
        )
        
        # Update layout
        fig.update_layout(
            title={
                'text': 'AI Shocks Portfolio Performance<br>' +
                        f'<sub>Value-weighted portfolio based on {self.base_date} market caps</sub>',
                'x': 0.5,
                'font': {'size': 20}
            },
            showlegend=True,
            height=800,
            template='plotly_white',
            hovermode='x unified'
        )
        
        # Update axes
        fig.update_xaxes(title_text="Date", row=2, col=1)
        fig.update_yaxes(title_text="Portfolio Value ($)", row=1, col=1)
        fig.update_yaxes(title_text="Daily Return (%)", row=2, col=1)
        
        # Add performance statistics as annotation
        portfolio_return = (self.portfolio_data['portfolio_value'].iloc[-1] / 100 - 1) * 100
        spy_return = (self.portfolio_data['spy_value'].iloc[-1] / 100 - 1) * 100
        outperformance = portfolio_return - spy_return
        
        portfolio_vol = self.portfolio_data['daily_return'].std() * np.sqrt(252) * 100  # Annualized
        spy_vol = self.portfolio_data['spy_daily_return'].std() * np.sqrt(252) * 100
        
        stats_text = (f"<b>Performance Summary</b><br>"
                     f"AI Portfolio: {portfolio_return:.1f}%<br>"
                     f"S&P 500: {spy_return:.1f}%<br>"
                     f"Outperformance: {outperformance:+.1f}%<br>"
                     f"<br>"
                     f"Portfolio Vol: {portfolio_vol:.1f}%<br>"
                     f"S&P 500 Vol: {spy_vol:.1f}%<br>"
                     f"Stocks: {len(self.weights)}")
        
        fig.add_annotation(
            text=stats_text,
            xref="paper", yref="paper",
            x=0.02, y=0.98,
            showarrow=False,
            align="left",
            bgcolor="rgba(255,255,255,0.9)",
            bordercolor="gray",
            borderwidth=1,
            font=dict(size=11)
        )
        
        # Save as HTML
        fig.write_html(
            html_filename,
            include_plotlyjs=True,
            config={'displayModeBar': True, 'displaylogo': False}
        )
        
        print(f"Interactive chart saved as {html_filename}")
        print(f"  AI Portfolio Return: {portfolio_return:.2f}%")
        print(f"  S&P 500 Return: {spy_return:.2f}%")
        print(f"  Outperformance: {outperformance:+.2f}%")
    
    def run_full_analysis(self):
        """Run the complete portfolio analysis workflow"""
        print("=" * 60)
        print("AI SHOCKS PORTFOLIO MONITOR")
        print("=" * 60)
        
        # Step 1: Load ticker list
        if not self.load_ticker_list():
            return False
        
        # Step 2: Get market caps on base date
        successful_tickers = self.get_market_caps_base_date()
        if not successful_tickers:
            print("Error: No market cap data retrieved")
            return False
        
        # Step 3: Calculate weights
        self.calculate_weights()
        
        # Step 4: Fetch portfolio data and calculate returns
        self.fetch_portfolio_data()
        
        # Step 5: Save dataset
        self.save_dataset()
        
        # Step 6: Create interactive chart
        self.create_interactive_chart()
        
        print("\n" + "=" * 60)
        print("ANALYSIS COMPLETE!")
        print("=" * 60)
        print(f"Files created:")
        print(f"  • ai_portfolio_data.csv - Main portfolio dataset")
        print(f"  • ai_portfolio_data_weights.csv - Portfolio weights")
        print(f"  • ai_portfolio_chart.html - Interactive chart")
        if self.ticker_changes:
            print(f"  • ai_portfolio_data_changes.csv - Ticker changes detected")
        
        return True


def main():
    """Main execution function - less abstracted for easier modifications"""
    print("=" * 60)
    print("AI SHOCKS PORTFOLIO MONITOR")
    print("=" * 60)
    
    # Initialize portfolio monitor
    monitor = PortfolioMonitor(
        ticker_file='tickerlist.txt',
        base_date='2022-10-25'
    )
    
    # Step 1: Load ticker list
    if not monitor.load_ticker_list():
        print("Error: Failed to load ticker list")
        return
    
    # Step 2: Get market caps on base date for weighting
    successful_tickers = monitor.get_market_caps_base_date()
    if not successful_tickers:
        print("Error: No market cap data retrieved")
        return
    
    # Step 3: Calculate portfolio weights
    monitor.calculate_weights()
    
    # Step 4: Fetch portfolio data and calculate returns (includes S&P 500)
    monitor.fetch_portfolio_data()
    
    # Step 5: Save dataset
    monitor.save_dataset()
    
    # Step 6: Create interactive chart with S&P 500 comparison
    monitor.create_interactive_chart()
    
    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE!")
    print("=" * 60)
    print(f"Files created:")
    print(f"  • ai_portfolio_data.csv - Main portfolio dataset with S&P 500 data")
    print(f"  • ai_portfolio_data_weights.csv - Portfolio weights")
    print(f"  • ai_portfolio_chart.html - Interactive chart with S&P 500 comparison")
    if monitor.ticker_changes:
        print(f"  • ai_portfolio_data_changes.csv - Ticker changes detected")
    
    print("\nYou can modify individual steps in main() for custom analysis.")


if __name__ == "__main__":
    main()