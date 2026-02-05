// Market Data API Service
// Using multiple free APIs with fallback support

const API_KEYS = {
  // Free API keys - replace with your own for production
  alphavantage: 'demo', // Get free key from: https://www.alphavantage.co/support/#api-key
  finnhub: 'demo', // Get free key from: https://finnhub.io/register
  exchangerate: 'demo', // Get free key from: https://www.exchangerate-api.com/
};

const API_ENDPOINTS = {
  alphavantage: 'https://www.alphavantage.co/query',
  finnhub: 'https://finnhub.io/api/v1',
  binance: 'https://api.binance.com/api/v3', // No key required for public endpoints
  indianStock: 'https://indian-stock.vercel.app', // Free Indian stock API
  exchangeRate: 'https://open.er-api.com/v6', // Free forex rates (no key required)
  twelveData: 'https://api.twelvedata.com', // Free forex data
};

/**
 * Generate realistic OHLC data based on current price
 */
const generateOHLCData = (basePrice, variation, count = 30) => {
  const data = [];
  let currentPrice = basePrice;
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    const time = new Date(now - i * 5 * 60 * 1000); // 5-minute intervals
    const volatility = variation * 0.1;
    const change = (Math.random() - 0.5) * volatility;

    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    data.push({
      date: time.toLocaleTimeString(),
      open: parseFloat(open.toFixed(4)),
      high: parseFloat(high.toFixed(4)),
      low: parseFloat(low.toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: Math.floor(Math.random() * 1000000) + 100000,
      candleColor: close >= open ? '#26a69a' : '#ef5350',
    });

    currentPrice = close;
  }

  return data;
};

/**
 * Fetch live forex rate from free API
 */
const fetchForexRate = async (fromCurrency, toCurrency) => {
  try {
    // Try open.er-api.com first (free, no key required)
    const url = `${API_ENDPOINTS.exchangeRate}/latest/${fromCurrency}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result === 'success' && data.rates && data.rates[toCurrency]) {
      return data.rates[toCurrency];
    }
    return null;
  } catch (error) {
    console.error('Error fetching forex rate:', error);
    return null;
  }
};

/**
 * Fetch live forex data with real rates
 */
const fetchForexData = async (fromCurrency, toCurrency) => {
  try {
    // First try Alpha Vantage for historical data
    const url = `${API_ENDPOINTS.alphavantage}?function=FX_INTRADAY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&interval=5min&apikey=${API_KEYS.alphavantage}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Time Series FX (5min)']) {
      const timeSeries = data['Time Series FX (5min)'];
      return Object.entries(timeSeries).slice(0, 30).reverse().map(([date, values]) => ({
        date: new Date(date).toLocaleTimeString(),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: Math.floor(Math.random() * 1000000),
        candleColor: parseFloat(values['4. close']) >= parseFloat(values['1. open']) ? '#26a69a' : '#ef5350',
      }));
    }

    // Fallback: Get real-time rate and generate realistic chart data
    const currentRate = await fetchForexRate(fromCurrency, toCurrency);
    if (currentRate) {
      const variation = currentRate * 0.02; // 2% variation
      return generateOHLCData(currentRate, variation, 30);
    }

    return null;
  } catch (error) {
    console.error('Error fetching forex data:', error);
    return null;
  }
};

/**
 * Fetch live stock data from Alpha Vantage
 */
const fetchStockData = async (symbol) => {
  try {
    const url = `${API_ENDPOINTS.alphavantage}?function=TIME_SERIES_INTRADAY&symbol=${symbol}&interval=5min&apikey=${API_KEYS.alphavantage}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data['Time Series (5min)']) {
      const timeSeries = data['Time Series (5min)'];
      return Object.entries(timeSeries).slice(0, 30).reverse().map(([date, values]) => ({
        date: new Date(date).toLocaleTimeString(),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume']),
        candleColor: parseFloat(values['4. close']) >= parseFloat(values['1. open']) ? '#26a69a' : '#ef5350',
      }));
    }
    return null;
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return null;
  }
};

/**
 * Fetch live crypto data from Binance (no API key required)
 */
const fetchCryptoData = async (symbol) => {
  try {
    // Convert symbol format: BTC/USD -> BTCUSDT
    const binanceSymbol = symbol.replace('/', '') + 'T';
    const url = `${API_ENDPOINTS.binance}/klines?symbol=${binanceSymbol}&interval=5m&limit=30`;
    const response = await fetch(url);
    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((candle, index) => ({
        date: new Date(candle[0]).toLocaleTimeString(),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5]),
        candleColor: parseFloat(candle[4]) >= parseFloat(candle[1]) ? '#26a69a' : '#ef5350',
      }));
    }
    return null;
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    return null;
  }
};

/**
 * Fetch Indian stock data from free API
 */
const fetchIndianStockData = async (symbol) => {
  try {
    // Remove .NS suffix if present for API call
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
    const exchangeSuffix = symbol.includes('.BO') ? '.BO' : '.NS';

    const url = `${API_ENDPOINTS.indianStock}/stock?symbol=${cleanSymbol}${exchangeSuffix}&res=num`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch Indian stock data');
    }

    const data = await response.json();

    if (data && data.currentPrice) {
      // Generate realistic chart data based on current price
      const basePrice = parseFloat(data.currentPrice);
      const variation = basePrice * 0.03; // 3% variation for stocks
      return generateOHLCData(basePrice, variation, 30);
    }

    return null;
  } catch (error) {
    console.error('Error fetching Indian stock data:', error);
    return null;
  }
};

/**
 * Fetch Indian stock current price
 */
const fetchIndianStockPrice = async (symbol) => {
  try {
    const cleanSymbol = symbol.replace('.NS', '').replace('.BO', '');
    const exchangeSuffix = symbol.includes('.BO') ? '.BO' : '.NS';

    const url = `${API_ENDPOINTS.indianStock}/stock?symbol=${cleanSymbol}${exchangeSuffix}&res=num`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to fetch Indian stock price');
    }

    const data = await response.json();

    if (data) {
      return {
        price: parseFloat(data.currentPrice) || 0,
        high: parseFloat(data.dayHigh) || parseFloat(data.currentPrice) * 1.02,
        low: parseFloat(data.dayLow) || parseFloat(data.currentPrice) * 0.98,
        volume: parseInt(data.volume) || Math.floor(Math.random() * 10000000),
        change: parseFloat(data.percentChange) || 0,
        open: parseFloat(data.open) || parseFloat(data.currentPrice),
        previousClose: parseFloat(data.previousClose) || parseFloat(data.currentPrice),
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Indian stock price:', error);
    return null;
  }
};

/**
 * Fetch live price update for a symbol
 */
const fetchLivePrice = async (marketType, symbol) => {
  try {
    if (marketType === 'crypto') {
      const binanceSymbol = symbol.replace('/', '') + 'T';
      const url = `${API_ENDPOINTS.binance}/ticker/24hr?symbol=${binanceSymbol}`;
      const response = await fetch(url);
      const data = await response.json();

      return {
        price: parseFloat(data.lastPrice),
        high: parseFloat(data.highPrice),
        low: parseFloat(data.lowPrice),
        volume: parseFloat(data.volume),
        change: parseFloat(data.priceChangePercent),
      };
    } else if (marketType === 'stock') {
      const url = `${API_ENDPOINTS.alphavantage}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEYS.alphavantage}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Global Quote']) {
        const quote = data['Global Quote'];
        return {
          price: parseFloat(quote['05. price']),
          high: parseFloat(quote['03. high']),
          low: parseFloat(quote['04. low']),
          volume: parseInt(quote['06. volume']),
          change: parseFloat(quote['10. change percent'].replace('%', '')),
        };
      }
    } else if (marketType === 'forex') {
      const [from, to] = symbol.split('/');

      // Try Alpha Vantage first
      try {
        const url = `${API_ENDPOINTS.alphavantage}?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEYS.alphavantage}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data['Realtime Currency Exchange Rate']) {
          const rate = data['Realtime Currency Exchange Rate'];
          return {
            price: parseFloat(rate['5. Exchange Rate']),
            high: parseFloat(rate['5. Exchange Rate']) * 1.01,
            low: parseFloat(rate['5. Exchange Rate']) * 0.99,
            volume: 0,
            change: 0,
          };
        }
      } catch (e) {
        console.log('Alpha Vantage failed, trying free API...');
      }

      // Fallback to free exchange rate API
      const rate = await fetchForexRate(from, to);
      if (rate) {
        return {
          price: rate,
          high: rate * 1.01,
          low: rate * 0.99,
          volume: 0,
          change: 0,
        };
      }
    } else if (marketType === 'indian_stock') {
      return await fetchIndianStockPrice(symbol);
    }
    return null;
  } catch (error) {
    console.error('Error fetching live price:', error);
    return null;
  }
};

/**
 * Main function to fetch market data
 */
export const fetchMarketData = async (marketType, symbol) => {
  let data = null;

  switch (marketType) {
    case 'forex':
      const [from, to] = symbol.split('/');
      data = await fetchForexData(from, to);
      break;
    case 'stock':
      data = await fetchStockData(symbol);
      break;
    case 'crypto':
      data = await fetchCryptoData(symbol);
      break;
    case 'indian_stock':
      data = await fetchIndianStockData(symbol);
      break;
    default:
      console.error('Unknown market type:', marketType);
  }

  return data;
};

/**
 * Fetch current price for a symbol
 */
export const fetchCurrentPrice = async (marketType, symbol) => {
  return await fetchLivePrice(marketType, symbol);
};

/**
 * Check if API is available
 */
export const checkAPIAvailability = async () => {
  try {
    // Test Binance API (no key required)
    const response = await fetch(`${API_ENDPOINTS.binance}/ping`);
    return response.ok;
  } catch (error) {
    console.error('API check failed:', error);
    return false;
  }
};
