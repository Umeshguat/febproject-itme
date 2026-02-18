import React, { useState, useEffect, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
} from 'recharts';
import { fetchMarketData, fetchCurrentPrice } from '../services/marketDataService';

// Market data configurations
const MARKETS = {
  forex: [
    { symbol: 'EUR/USD', basePrice: 1.08, variation: 0.02 },
    { symbol: 'GBP/USD', basePrice: 1.26, variation: 0.03 },
    { symbol: 'USD/JPY', basePrice: 149.5, variation: 2.0 },
    { symbol: 'USD/CHF', basePrice: 0.88, variation: 0.02 },
    { symbol: 'AUD/USD', basePrice: 0.65, variation: 0.02 },
    { symbol: 'USD/INR', basePrice: 83.5, variation: 0.5 },
  ],
  stock: [
    { symbol: 'AAPL', basePrice: 175, variation: 10 },
    { symbol: 'GOOGL', basePrice: 140, variation: 8 },
    { symbol: 'MSFT', basePrice: 380, variation: 15 },
    { symbol: 'TSLA', basePrice: 250, variation: 20 },
    { symbol: 'AMZN', basePrice: 145, variation: 10 },
  ],
  indian_stock: [
    { symbol: 'RELIANCE', basePrice: 2500, variation: 100 },
    { symbol: 'TCS', basePrice: 3800, variation: 150 },
    { symbol: 'HDFCBANK', basePrice: 1600, variation: 80 },
    { symbol: 'INFY', basePrice: 1500, variation: 70 },
    { symbol: 'ITC', basePrice: 450, variation: 20 },
    { symbol: 'SBIN', basePrice: 620, variation: 30 },
    { symbol: 'BHARTIARTL', basePrice: 1200, variation: 60 },
    { symbol: 'ICICIBANK', basePrice: 1050, variation: 50 },
    { symbol: 'KOTAKBANK', basePrice: 1750, variation: 70 },
    { symbol: 'LT', basePrice: 3200, variation: 120 },
  ],
  crypto: [
    { symbol: 'BTC/USD', basePrice: 50000, variation: 2000 },
    { symbol: 'ETH/USD', basePrice: 2500, variation: 150 },
    { symbol: 'BNB/USD', basePrice: 320, variation: 25 },
  ]
};

// Calculate Simple Moving Average (SMA)
const calculateSMA = (data, period) => {
  if (!data || data.length < period) return data;

  return data.map((item, index) => {
    if (index < period - 1) {
      return { ...item, [`sma${period}`]: null };
    }

    const sum = data
      .slice(index - period + 1, index + 1)
      .reduce((acc, d) => acc + d.close, 0);

    return { ...item, [`sma${period}`]: sum / period };
  });
};

// Add multiple SMAs to data
const addSMAToData = (data) => {
  if (!data || data.length === 0) return data;

  let result = [...data];
  result = calculateSMA(result, 22);
  result = calculateSMA(result, 33);

  return result;
};

// Fibonacci calculation utilities
const calculateFibonacciLevels = (data, lookback = 14) => {
  if (!data || data.length === 0) return null;

  const recentData = data.slice(-Math.min(lookback, data.length));
  const high = Math.max(...recentData.map(d => d.high));
  const low = Math.min(...recentData.map(d => d.low));
  const diff = high - low;

  return {
    level0: high,
    level236: high - (diff * 0.236),
    level382: high - (diff * 0.382),
    level500: high - (diff * 0.500),
    level618: high - (diff * 0.618),
    level786: high - (diff * 0.786),
    level100: low,
  };
};

const calculateFibonacciSignals = (currentPrice, fibLevels, recentData) => {
  if (!fibLevels) return { signal: 'NEUTRAL', strength: 50, entry: null, exit: null, reason: 'No data available' };

  const range = fibLevels.level0 - fibLevels.level100;
  if (range <= 0) return { signal: 'NEUTRAL', strength: 50, entry: currentPrice, exit: null, reason: 'No price range' };

  // 1. Candle direction: close vs open (changes every tick since close updates but open stays)
  let candleScore = 0;
  if (recentData && recentData.length > 0) {
    const lastCandle = recentData[recentData.length - 1];
    const candleChange = ((lastCandle.close - lastCandle.open) / lastCandle.open) * 100;
    if (candleChange > 0.3) candleScore = 2;
    else if (candleChange > 0) candleScore = 1;
    else if (candleChange < -0.3) candleScore = -2;
    else if (candleChange < 0) candleScore = -1;
  }

  // 2. Cross-candle direction: current price vs previous candle close
  let crossScore = 0;
  if (recentData && recentData.length >= 2) {
    const prevCandle = recentData[recentData.length - 2];
    const crossChange = ((currentPrice - prevCandle.close) / prevCandle.close) * 100;
    if (crossChange > 0.2) crossScore = 1;
    else if (crossChange < -0.2) crossScore = -1;
  }

  // 3. SMA trend (SMA22 vs SMA33 crossover)
  let smaScore = 0;
  if (recentData && recentData.length > 0) {
    const lastCandle = recentData[recentData.length - 1];
    if (lastCandle.sma22 != null && lastCandle.sma33 != null) {
      if (lastCandle.sma22 > lastCandle.sma33) smaScore = 1;
      else if (lastCandle.sma22 < lastCandle.sma33) smaScore = -1;
    }
  }

  // 4. Price vs SMA22 (above = bullish, below = bearish) - changes every tick
  let priceVsSmaScore = 0;
  if (recentData && recentData.length > 0) {
    const lastCandle = recentData[recentData.length - 1];
    if (lastCandle.sma22 != null) {
      if (currentPrice > lastCandle.sma22) priceVsSmaScore = 1;
      else priceVsSmaScore = -1;
    }
  }

  // 5. Fibonacci zone classification
  let zoneScore = 0;
  let zoneName = '';

  if (currentPrice >= fibLevels.level0) {
    zoneScore = -3; zoneName = 'Above resistance';
  } else if (currentPrice >= fibLevels.level236) {
    zoneScore = -2; zoneName = 'Resistance zone';
  } else if (currentPrice >= fibLevels.level382) {
    zoneScore = -1; zoneName = 'Upper zone';
  } else if (currentPrice >= fibLevels.level500) {
    zoneScore = 0; zoneName = 'Mid zone';
  } else if (currentPrice >= fibLevels.level618) {
    zoneScore = 0; zoneName = 'Mid zone';
  } else if (currentPrice >= fibLevels.level786) {
    zoneScore = 1; zoneName = 'Support zone';
  } else if (currentPrice >= fibLevels.level100) {
    zoneScore = 2; zoneName = 'Strong support';
  } else {
    zoneScore = 3; zoneName = 'Below support';
  }

  // Combined score: range -8 to +8
  const totalScore = zoneScore + candleScore + crossScore + smaScore + priceVsSmaScore;
  const direction = candleScore > 0 ? 'Rising' : candleScore < 0 ? 'Falling' : 'Flat';

  let signal, strength, entry, exit, stopLoss, reason;

  if (totalScore >= 5) {
    signal = 'STRONG BUY'; strength = 92 + Math.min(totalScore - 5, 3);
    entry = currentPrice; exit = fibLevels.level236; stopLoss = fibLevels.level100;
    reason = `${zoneName} — ${direction} — All indicators align bullish`;
  } else if (totalScore >= 3) {
    signal = 'BUY'; strength = 75 + totalScore;
    entry = currentPrice; exit = fibLevels.level382; stopLoss = fibLevels.level786;
    reason = `${zoneName} — ${direction} — Bullish momentum detected`;
  } else if (totalScore >= 1) {
    signal = 'BUY'; strength = 58 + totalScore * 3;
    entry = currentPrice; exit = fibLevels.level500; stopLoss = fibLevels.level786;
    reason = `${zoneName} — ${direction} — Slight bullish bias`;
  } else if (totalScore === 0) {
    signal = 'HOLD'; strength = 50;
    entry = currentPrice; exit = null; stopLoss = null;
    reason = `${zoneName} — ${direction} — Neutral, awaiting direction`;
  } else if (totalScore >= -2) {
    signal = 'SELL'; strength = 58 + Math.abs(totalScore) * 3;
    entry = currentPrice; exit = fibLevels.level618; stopLoss = fibLevels.level236;
    reason = `${zoneName} — ${direction} — Slight bearish bias`;
  } else if (totalScore <= -5) {
    signal = 'STRONG SELL'; strength = 92 + Math.min(Math.abs(totalScore) - 5, 3);
    entry = currentPrice; exit = fibLevels.level786; stopLoss = fibLevels.level0;
    reason = `${zoneName} — ${direction} — All indicators align bearish`;
  } else {
    signal = 'SELL'; strength = 75 + Math.abs(totalScore);
    entry = currentPrice; exit = fibLevels.level500; stopLoss = fibLevels.level0;
    reason = `${zoneName} — ${direction} — Bearish momentum detected`;
  }

  return { signal, strength, entry, exit, stopLoss, reason };
};

// Technical indicator calculations
const calculateRSI = (data, period = 14) => {
  if (!data || data.length < period + 1) return null;
  const recent = data.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const change = recent[i].close - recent[i - 1].close;
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
};

const calculateEMA = (arr, period) => {
  const k = 2 / (period + 1);
  let result = arr[0];
  for (let i = 1; i < arr.length; i++) {
    result = arr[i] * k + result * (1 - k);
  }
  return result;
};

const calculateMACD = (data) => {
  if (!data || data.length < 26) return null;
  const closes = data.map(d => d.close);
  const ema12 = calculateEMA(closes.slice(-12), 12);
  const ema26 = calculateEMA(closes.slice(-26), 26);
  return ema12 - ema26;
};

const calculateStochastic = (data, period = 14) => {
  if (!data || data.length < period) return null;
  const recent = data.slice(-period);
  const high = Math.max(...recent.map(d => d.high));
  const low = Math.min(...recent.map(d => d.low));
  const close = recent[recent.length - 1].close;
  if (high === low) return 50;
  return ((close - low) / (high - low)) * 100;
};

const calculateBollingerPosition = (data, period = 20) => {
  if (!data || data.length < period) return null;
  const recent = data.slice(-period);
  const closes = recent.map(d => d.close);
  const mean = closes.reduce((a, b) => a + b, 0) / period;
  const stdDev = Math.sqrt(closes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period);
  const current = closes[closes.length - 1];
  if (current >= mean + 2 * stdDev) return 'Upper';
  if (current <= mean - 2 * stdDev) return 'Lower';
  if (current >= mean) return 'Mid-Upper';
  return 'Mid-Lower';
};

const computeIndicators = (chartData) => {
  if (!chartData || chartData.length === 0) return null;
  const rsi = calculateRSI(chartData);
  const macd = calculateMACD(chartData);
  const stochastic = calculateStochastic(chartData);
  const bollingerPos = calculateBollingerPosition(chartData);
  const lastCandle = chartData[chartData.length - 1];

  return {
    rsi: rsi != null ? parseFloat(rsi.toFixed(1)) : null,
    macd: macd != null ? parseFloat(macd.toFixed(2)) : null,
    stochastic: stochastic != null ? parseFloat(stochastic.toFixed(1)) : null,
    bollingerPosition: bollingerPos,
    sma22: lastCandle?.sma22 ? parseFloat(lastCandle.sma22.toFixed(2)) : null,
    sma33: lastCandle?.sma33 ? parseFloat(lastCandle.sma33.toFixed(2)) : null,
    currentPrice: lastCandle?.close || null,
  };
};

// Sample trading data generator
const generateSampleData = (basePrice, variation) => {
  const data = [];
  let currentPrice = basePrice;

  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - 0.5) * variation;
    currentPrice += change;
    const open = currentPrice;
    const close = currentPrice + (Math.random() - 0.5) * (variation / 2);
    const high = Math.max(open, close) + Math.random() * (variation / 4);
    const low = Math.min(open, close) - Math.random() * (variation / 4);
    const volume = Math.floor(Math.random() * 1000000);

    data.push({
      date: `Day ${i + 1}`,
      open: parseFloat(open.toFixed(basePrice < 10 ? 4 : 2)),
      high: parseFloat(high.toFixed(basePrice < 10 ? 4 : 2)),
      low: parseFloat(low.toFixed(basePrice < 10 ? 4 : 2)),
      close: parseFloat(close.toFixed(basePrice < 10 ? 4 : 2)),
      volume: volume,
      candleColor: close >= open ? '#26a69a' : '#ef5350',
    });
  }

  return data;
};

const TradingChart = ({ onFibonacciUpdate }) => {
  const [marketType, setMarketType] = useState('crypto');
  const [selectedSymbol, setSelectedSymbol] = useState(MARKETS.crypto[0]);
  const [data, setData] = useState(addSMAToData(generateSampleData(MARKETS.crypto[0].basePrice, MARKETS.crypto[0].variation)));
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('candlestick');
  const [liveUpdate, setLiveUpdate] = useState(true);
  const [fibonacciLevels, setFibonacciLevels] = useState(null);
  const [fibonacciSignal, setFibonacciSignal] = useState(null);
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [showSMA, setShowSMA] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [useRealData, setUseRealData] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [indicators, setIndicators] = useState(null);
  const intervalRef = useRef(null);
  const dataFetchRef = useRef(null);
  const tickCountRef = useRef(0);

  // TradingView-style price formatter based on market type
  const formatPrice = (value) => {
    if (marketType === 'forex') {
      return value.toFixed(5); // e.g. 1.18600
    }
    if (value >= 1000) {
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // e.g. 18,351.55
    }
    return value.toFixed(2); // e.g. 320.50
  };

  // Fetch live data from API
  const fetchLiveData = async (type, symbol) => {
    setIsLoadingData(true);
    setApiError(null);

    try {
      const liveData = await fetchMarketData(type, symbol.symbol);

      if (liveData && liveData.length > 0) {
        const dataWithSMA = addSMAToData(liveData);
        setData(dataWithSMA);
        updateFibonacciAnalysis(dataWithSMA);
        setUseRealData(true);
      } else {
        // Fallback to simulated data
        const fallbackData = addSMAToData(generateSampleData(symbol.basePrice, symbol.variation));
        setData(fallbackData);
        updateFibonacciAnalysis(fallbackData);
        setUseRealData(false);
        setApiError('Using simulated data (API limit or no data available)');
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      // Fallback to simulated data
      const fallbackData = addSMAToData(generateSampleData(symbol.basePrice, symbol.variation));
      setData(fallbackData);
      updateFibonacciAnalysis(fallbackData);
      setUseRealData(false);
      setApiError('API error - using simulated data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleMarketChange = (type) => {
    setMarketType(type);
    const newSymbol = MARKETS[type][0];
    setSelectedSymbol(newSymbol);

    if (useRealData) {
      fetchLiveData(type, newSymbol);
    } else {
      const newData = addSMAToData(generateSampleData(newSymbol.basePrice, newSymbol.variation));
      setData(newData);
      updateFibonacciAnalysis(newData);
    }
  };

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);

    if (useRealData) {
      fetchLiveData(marketType, symbol);
    } else {
      const newData = addSMAToData(generateSampleData(symbol.basePrice, symbol.variation));
      setData(newData);
      updateFibonacciAnalysis(newData);
    }
  };

  const updateFibonacciAnalysis = (chartData) => {
    const levels = calculateFibonacciLevels(chartData);
    setFibonacciLevels(levels);

    if (levels && chartData.length > 0) {
      const currentPrice = chartData[chartData.length - 1].close;
      const signal = calculateFibonacciSignals(currentPrice, levels, chartData);
      setFibonacciSignal(signal);
    }

    setIndicators(computeIndicators(chartData));
  };

  // Load initial data
  useEffect(() => {
    if (useRealData) {
      fetchLiveData(marketType, selectedSymbol);
    }
  }, []);

  // Update Fibonacci analysis when data changes
  useEffect(() => {
    updateFibonacciAnalysis(data);
  }, [data]);

  // Notify parent component when Fibonacci data changes
  useEffect(() => {
    if (onFibonacciUpdate && fibonacciLevels && fibonacciSignal) {
      onFibonacciUpdate(fibonacciLevels, fibonacciSignal, marketType, indicators);
    }
  }, [fibonacciLevels, fibonacciSignal, marketType, indicators]);

  // Auto-refresh live data every 30 seconds
  useEffect(() => {
    if (useRealData && liveUpdate) {
      dataFetchRef.current = setInterval(() => {
        fetchLiveData(marketType, selectedSymbol);
      }, 30000); // Refresh every 30 seconds

      return () => {
        if (dataFetchRef.current) {
          clearInterval(dataFetchRef.current);
        }
      };
    }
  }, [useRealData, liveUpdate, marketType, selectedSymbol]);

  // Live data update simulation (only for simulated data)
  useEffect(() => {
    if (liveUpdate && !useRealData) {
      tickCountRef.current = 0;
      intervalRef.current = setInterval(() => {
        setData(prevData => {
          const newData = [...prevData];
          tickCountRef.current += 1;
          const decimals = selectedSymbol.basePrice < 10 ? 4 : 2;

          if (tickCountRef.current % 5 === 0) {
            // Every ~10 seconds, add a new candle for more dynamic price action
            const lastCandle = newData[newData.length - 1];
            const change = (Math.random() - 0.5) * selectedSymbol.variation / 3;
            const newOpen = lastCandle.close;
            const newClose = newOpen + change;
            const newHigh = Math.max(newOpen, newClose) + Math.random() * (selectedSymbol.variation / 6);
            const newLow = Math.min(newOpen, newClose) - Math.random() * (selectedSymbol.variation / 6);
            const candleNum = parseInt(lastCandle.date.replace('Day ', '')) + 1;

            newData.push({
              date: `Day ${candleNum}`,
              open: parseFloat(newOpen.toFixed(decimals)),
              high: parseFloat(newHigh.toFixed(decimals)),
              low: parseFloat(newLow.toFixed(decimals)),
              close: parseFloat(newClose.toFixed(decimals)),
              volume: Math.floor(Math.random() * 1000000),
              candleColor: newClose >= newOpen ? '#26a69a' : '#ef5350',
            });

            if (newData.length > 30) newData.shift();
          } else {
            // Update the last candle with new random values
            const lastCandle = newData[newData.length - 1];
            const change = (Math.random() - 0.5) * (selectedSymbol.variation / 5);
            const newClose = lastCandle.close + change;
            const newHigh = Math.max(lastCandle.high, newClose);
            const newLow = Math.min(lastCandle.low, newClose);

            newData[newData.length - 1] = {
              ...lastCandle,
              close: parseFloat(newClose.toFixed(decimals)),
              high: parseFloat(newHigh.toFixed(decimals)),
              low: parseFloat(newLow.toFixed(decimals)),
              volume: lastCandle.volume + Math.floor(Math.random() * 10000),
            };
          }

          return addSMAToData(newData);
        });
      }, 2000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [liveUpdate, useRealData, selectedSymbol]);

  const renderCandlestick = (props) => {
    const { x, y, width, height, index } = props;
    const candle = data[index];

    if (!candle || !candle.open || !candle.high || !candle.low || !candle.close) return null;

    const { open, high, low, close } = candle;
    const isGreen = close >= open;

    // TradingView-style colors
    const bullColor = '#089981'; // TradingView green
    const bearColor = '#F23645'; // TradingView red
    const color = isGreen ? bullColor : bearColor;

    const ratio = height / (Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low)));
    const minPrice = Math.min(...data.map(d => d.low));

    const yHigh = y + height - (high - minPrice) * ratio;
    const yLow = y + height - (low - minPrice) * ratio;
    const yOpen = y + height - (open - minPrice) * ratio;
    const yClose = y + height - (close - minPrice) * ratio;

    // TradingView style: wider candles with small gaps
    const candleWidth = Math.max(width * 0.8, 2);
    const candleX = x + (width - candleWidth) / 2;
    const wickWidth = Math.max(1, candleWidth * 0.15);

    const bodyTop = isGreen ? yClose : yOpen;
    const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);

    return (
      <g key={`candle-${index}`}>
        {/* Upper wick */}
        <rect
          x={x + width / 2 - wickWidth / 2}
          y={yHigh}
          width={wickWidth}
          height={Math.abs(bodyTop - yHigh)}
          fill={color}
        />

        {/* Lower wick */}
        <rect
          x={x + width / 2 - wickWidth / 2}
          y={bodyTop + bodyHeight}
          width={wickWidth}
          height={Math.abs(yLow - (bodyTop + bodyHeight))}
          fill={color}
        />

        {/* Candle body - TradingView style */}
        <rect
          x={candleX}
          y={bodyTop}
          width={candleWidth}
          height={bodyHeight}
          fill={color}
          rx={1}
          ry={1}
        />
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const priceSymbol = marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$';
      const isGreen = data.close >= data.open;
      const change = data.close - data.open;
      const changePercent = (change / data.open) * 100;

      return (
        <div style={{
          backgroundColor: '#131722',
          padding: '10px 12px',
          border: '1px solid #2a2e39',
          borderRadius: '4px',
          color: '#d1d4dc',
          fontSize: '12px',
          fontFamily: 'monospace',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
        }}>
          <div style={{ marginBottom: '8px', fontSize: '11px', color: '#787b86' }}>{data.date}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 12px' }}>
            <span style={{ color: '#787b86' }}>O</span>
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{priceSymbol}{formatPrice(data.open)}</span>

            <span style={{ color: '#787b86' }}>H</span>
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{priceSymbol}{formatPrice(data.high)}</span>

            <span style={{ color: '#787b86' }}>L</span>
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{priceSymbol}{formatPrice(data.low)}</span>

            <span style={{ color: '#787b86' }}>C</span>
            <span style={{ textAlign: 'right', color: isGreen ? '#26a69a' : '#f23645', fontWeight: 'bold' }}>
              {priceSymbol}{formatPrice(data.close)}
            </span>

            <span style={{ color: '#787b86' }}>Change</span>
            <span style={{ textAlign: 'right', color: isGreen ? '#26a69a' : '#f23645' }}>
              {change > 0 ? '+' : ''}{priceSymbol}{formatPrice(Math.abs(change))} ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>

            <span style={{ color: '#787b86' }}>Vol</span>
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{data.volume.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {/* Market Type Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '8px 12px',
        backgroundColor: '#1e222d',
        borderRadius: '4px',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={marketType}
            onChange={(e) => handleMarketChange(e.target.value)}
            style={{
              padding: '6px 10px',
              backgroundColor: '#2a2e39',
              color: '#d1d4dc',
              border: '1px solid #434651',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              outline: 'none',
              fontWeight: '500'
            }}
          >
            <option value="forex">Forex</option>
            <option value="stock">US Stock</option>
            <option value="indian_stock">Indian Stock (NSE)</option>
            <option value="crypto">Crypto</option>
          </select>

          <select
            value={selectedSymbol.symbol}
            onChange={(e) => {
              const symbol = MARKETS[marketType].find(s => s.symbol === e.target.value);
              handleSymbolChange(symbol);
            }}
            style={{
              padding: '6px 10px',
              backgroundColor: '#2a2e39',
              color: '#d1d4dc',
              border: '1px solid #434651',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              outline: 'none',
              fontWeight: '500'
            }}
          >
            {MARKETS[marketType].map((symbol) => (
              <option key={symbol.symbol} value={symbol.symbol}>
                {symbol.symbol}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFibonacci(!showFibonacci)}
            style={{
              padding: '6px 12px',
              backgroundColor: showFibonacci ? '#2962ff' : 'transparent',
              color: showFibonacci ? '#fff' : '#787b86',
              border: showFibonacci ? '1px solid #2962ff' : '1px solid #434651',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Fibonacci
          </button>

          <button
            onClick={() => setShowSMA(!showSMA)}
            style={{
              padding: '6px 12px',
              backgroundColor: showSMA ? '#FF6D00' : 'transparent',
              color: showSMA ? '#fff' : '#787b86',
              border: showSMA ? '1px solid #FF6D00' : '1px solid #434651',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            SMA 22/33
          </button>

          <button
            onClick={() => {
              setUseRealData(!useRealData);
              if (!useRealData) {
                fetchLiveData(marketType, selectedSymbol);
              }
            }}
            disabled={isLoadingData}
            style={{
              padding: '6px 12px',
              backgroundColor: useRealData ? '#26a69a' : '#787b86',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoadingData ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: '500',
              transition: 'all 0.2s',
              opacity: isLoadingData ? 0.6 : 1
            }}
          >
            {isLoadingData ? 'Loading...' : useRealData ? 'Live Data' : 'Demo Data'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {['candlestick', 'line', 'area'].map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              style={{
                padding: '6px 12px',
                backgroundColor: chartType === type ? '#2962ff' : 'transparent',
                color: chartType === type ? '#fff' : '#787b86',
                border: chartType === type ? '1px solid #2962ff' : '1px solid #434651',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
                fontWeight: '500'
              }}
            >
              {type === 'candlestick' ? '📊' : type === 'line' ? '📈' : '📉'}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '15px',
        padding: '0 12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ margin: 0, color: '#d1d4dc', fontSize: '18px', fontWeight: '600' }}>
            {selectedSymbol.symbol}
          </h2>
          {showSMA && data.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
              <span style={{ color: '#2962FF' }}>
                SMA22: {data[data.length - 1]?.sma22 ? formatPrice(data[data.length - 1].sma22) : '—'}
              </span>
              <span style={{ color: '#FF6D00' }}>
                SMA33: {data[data.length - 1]?.sma33 ? formatPrice(data[data.length - 1].sma33) : '—'}
              </span>
            </div>
          )}
          {apiError && (
            <div style={{
              fontSize: '10px',
              color: '#ffc107',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 193, 7, 0.3)'
            }}>
              {apiError}
            </div>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: liveUpdate && useRealData ? 'rgba(38, 166, 154, 0.1)' : 'rgba(120, 123, 134, 0.1)',
            borderRadius: '4px',
            border: `1px solid ${liveUpdate && useRealData ? 'rgba(38, 166, 154, 0.3)' : 'rgba(120, 123, 134, 0.3)'}`
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: liveUpdate && useRealData ? '#26a69a' : '#787b86',
              animation: liveUpdate && useRealData ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ color: liveUpdate && useRealData ? '#26a69a' : '#787b86', fontSize: '11px', fontWeight: '600' }}>
              {liveUpdate && useRealData ? 'LIVE' : liveUpdate ? 'DEMO' : 'PAUSED'}
            </span>
            <button
              onClick={() => setLiveUpdate(!liveUpdate)}
              style={{
                padding: '2px 8px',
                backgroundColor: 'transparent',
                color: '#2962ff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
                marginLeft: '2px'
              }}
            >
              {liveUpdate ? '⏸' : '▶'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['1H', '4H', '1D', '1W', '1M'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '6px 12px',
                backgroundColor: timeframe === tf ? '#2a2e39' : 'transparent',
                color: timeframe === tf ? '#d1d4dc' : '#787b86',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height="70%">
        {chartType === 'candlestick' ? (
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2962ff" stopOpacity={0.5}/>
                <stop offset="95%" stopColor="#2962ff" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="1 1" stroke="rgba(42, 46, 57, 0.5)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="rgba(120, 123, 134, 0.5)"
              tick={{ fill: '#787b86', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="price"
              orientation="right"
              stroke="rgba(120, 123, 134, 0.5)"
              tick={{ fill: '#787b86', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              domain={['auto', 'auto']}
              width={90}
              tickFormatter={formatPrice}
            />
            <YAxis
              yAxisId="volume"
              orientation="left"
              stroke="transparent"
              tick={false}
              tickLine={false}
              axisLine={false}
              width={0}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#787b86', strokeWidth: 1, strokeDasharray: '3 3' }} />

            {/* Fibonacci Retracement Levels */}
            {showFibonacci && fibonacciLevels && (
              <>
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level0} stroke="#ff6b6b" strokeWidth={1} strokeDasharray="5 5" dot={false} name="100% (High)" />
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level236} stroke="#ffd93d" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="23.6%" />
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level382} stroke="#6bcf7f" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="38.2%" />
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level500} stroke="#2962ff" strokeWidth={2} dot={false} name="50%" />
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level618} stroke="#c77dff" strokeWidth={2} strokeDasharray="3 3" dot={false} name="61.8% (Golden)" />
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level786} stroke="#ff9ff3" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="78.6%" />
                <Line yAxisId="price" type="monotone" dataKey={() => fibonacciLevels.level100} stroke="#26a69a" strokeWidth={1} strokeDasharray="5 5" dot={false} name="0% (Low)" />
              </>
            )}

            {/* 22-period SMA - Blue */}
            {showSMA && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma22"
                stroke="#2962FF"
                strokeWidth={2}
                dot={false}
                name="SMA 22"
                connectNulls={false}
              />
            )}

            {/* 33-period SMA - Orange */}
            {showSMA && (
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="sma33"
                stroke="#FF6D00"
                strokeWidth={2}
                dot={false}
                name="SMA 33"
                connectNulls={false}
              />
            )}

            <Bar
              yAxisId="volume"
              dataKey="volume"
              fill="url(#volumeGradient)"
              opacity={0.5}
              isAnimationActive={false}
            />
            <Bar
              yAxisId="price"
              dataKey="high"
              shape={renderCandlestick}
              isAnimationActive={false}
            />
          </ComposedChart>
        ) : chartType === 'line' ? (
          <LineChart
            data={data}
            margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
          >
            <defs>
              <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2196f3" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="date"
              stroke="#999"
              tick={{ fill: '#999' }}
            />
            <YAxis
              stroke="#999"
              tick={{ fill: '#999' }}
              domain={['auto', 'auto']}
              width={90}
              tickFormatter={formatPrice}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#999' }} />
            <Line
              type="monotone"
              dataKey="close"
              stroke="#2196f3"
              strokeWidth={2}
              dot={false}
              name="Close Price"
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="#26a69a"
              strokeWidth={1}
              dot={false}
              strokeDasharray="5 5"
              name="High"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="#ef5350"
              strokeWidth={1}
              dot={false}
              strokeDasharray="5 5"
              name="Low"
            />
          </LineChart>
        ) : (
          <AreaChart
            data={data}
            margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
          >
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2196f3" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#2196f3" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="date"
              stroke="#999"
              tick={{ fill: '#999' }}
            />
            <YAxis
              stroke="#999"
              tick={{ fill: '#999' }}
              domain={['auto', 'auto']}
              width={90}
              tickFormatter={formatPrice}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: '#999' }} />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#2196f3"
              fillOpacity={1}
              fill="url(#colorClose)"
              name="Close Price"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>

      {/* Fibonacci Signal Panel */}
      {showFibonacci && fibonacciSignal && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          backgroundColor: fibonacciSignal.signal.includes('BUY') ? 'rgba(38, 166, 154, 0.1)' :
                          fibonacciSignal.signal.includes('SELL') ? 'rgba(242, 54, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
          border: `2px solid ${fibonacciSignal.signal.includes('BUY') ? '#26a69a' :
                               fibonacciSignal.signal.includes('SELL') ? '#f23645' : '#ffc107'}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '15px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#787b86', marginBottom: '4px', fontWeight: '600' }}>FIBONACCI SIGNAL</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: fibonacciSignal.signal.includes('BUY') ? '#26a69a' :
                     fibonacciSignal.signal.includes('SELL') ? '#f23645' : '#ffc107'
            }}>
              {fibonacciSignal.signal}
            </div>
            <div style={{ fontSize: '12px', color: '#d1d4dc', marginTop: '4px' }}>
              {fibonacciSignal.reason}
            </div>
          </div>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {fibonacciSignal.entry && (
              <div style={{ padding: '8px', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#787b86', marginBottom: '2px' }}>Entry Point</div>
                <div style={{ fontSize: '14px', color: '#2962ff', fontWeight: 'bold' }}>
                  {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{formatPrice(fibonacciSignal.entry)}
                </div>
              </div>
            )}
            {fibonacciSignal.exit && (
              <div style={{ padding: '8px', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#787b86', marginBottom: '2px' }}>Target</div>
                <div style={{ fontSize: '14px', color: '#26a69a', fontWeight: 'bold' }}>
                  {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{formatPrice(fibonacciSignal.exit)}
                </div>
              </div>
            )}
            {fibonacciSignal.stopLoss && (
              <div style={{ padding: '8px', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#787b86', marginBottom: '2px' }}>Stop Loss</div>
                <div style={{ fontSize: '14px', color: '#f23645', fontWeight: 'bold' }}>
                  {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{formatPrice(fibonacciSignal.stopLoss)}
                </div>
              </div>
            )}
            <div style={{ padding: '8px', backgroundColor: '#1e222d', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#787b86', marginBottom: '2px' }}>Strength</div>
              <div style={{ fontSize: '14px', color: '#ffd93d', fontWeight: 'bold' }}>
                {fibonacciSignal.strength}%
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        marginTop: '15px',
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        backgroundColor: '#1e222d',
        borderRadius: '4px'
      }}>
        <div style={{
          padding: '10px',
          backgroundColor: '#131722',
          borderRadius: '4px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ color: '#787b86', fontSize: '11px', marginBottom: '4px', fontWeight: '500' }}>Price</div>
          <div style={{ color: '#d1d4dc', fontSize: '16px', fontWeight: '600' }}>
            {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{formatPrice(data[data.length - 1].close)}
          </div>
        </div>
        <div style={{
          padding: '10px',
          backgroundColor: '#131722',
          borderRadius: '4px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ color: '#787b86', fontSize: '11px', marginBottom: '4px', fontWeight: '500' }}>24h Change</div>
          <div style={{
            color: data[data.length - 1].close >= data[0].open ? '#26a69a' : '#f23645',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            {((data[data.length - 1].close - data[0].open) / data[0].open * 100) > 0 ? '+' : ''}
            {((data[data.length - 1].close - data[0].open) / data[0].open * 100).toFixed(2)}%
          </div>
        </div>
        <div style={{
          padding: '10px',
          backgroundColor: '#131722',
          borderRadius: '4px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ color: '#787b86', fontSize: '11px', marginBottom: '4px', fontWeight: '500' }}>24h High</div>
          <div style={{ color: '#d1d4dc', fontSize: '16px', fontWeight: '600' }}>
            {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{formatPrice(Math.max(...data.map(d => d.high)))}
          </div>
        </div>
        <div style={{
          padding: '10px',
          backgroundColor: '#131722',
          borderRadius: '4px',
          border: '1px solid #2a2e39'
        }}>
          <div style={{ color: '#787b86', fontSize: '11px', marginBottom: '4px', fontWeight: '500' }}>24h Low</div>
          <div style={{ color: '#d1d4dc', fontSize: '16px', fontWeight: '600' }}>
            {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{formatPrice(Math.min(...data.map(d => d.low)))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
