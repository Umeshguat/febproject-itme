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

// Fibonacci calculation utilities
const calculateFibonacciLevels = (data) => {
  if (!data || data.length === 0) return null;

  const high = Math.max(...data.map(d => d.high));
  const low = Math.min(...data.map(d => d.low));
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

const calculateFibonacciSignals = (currentPrice, fibLevels) => {
  if (!fibLevels) return { signal: 'NEUTRAL', strength: 0, entry: null, exit: null };

  const tolerance = 0.015; // 1.5% tolerance for better detection
  const range = fibLevels.level0 - fibLevels.level100;

  // Calculate distance to each level as percentage of total range
  const distToLevel0 = Math.abs(currentPrice - fibLevels.level0) / range;
  const distToLevel236 = Math.abs(currentPrice - fibLevels.level236) / range;
  const distToLevel382 = Math.abs(currentPrice - fibLevels.level382) / range;
  const distToLevel500 = Math.abs(currentPrice - fibLevels.level500) / range;
  const distToLevel618 = Math.abs(currentPrice - fibLevels.level618) / range;
  const distToLevel786 = Math.abs(currentPrice - fibLevels.level786) / range;
  const distToLevel100 = Math.abs(currentPrice - fibLevels.level100) / range;

  // Find closest level
  const distances = [
    { level: '0%', dist: distToLevel0, price: fibLevels.level0 },
    { level: '23.6%', dist: distToLevel236, price: fibLevels.level236 },
    { level: '38.2%', dist: distToLevel382, price: fibLevels.level382 },
    { level: '50%', dist: distToLevel500, price: fibLevels.level500 },
    { level: '61.8%', dist: distToLevel618, price: fibLevels.level618 },
    { level: '78.6%', dist: distToLevel786, price: fibLevels.level786 },
    { level: '100%', dist: distToLevel100, price: fibLevels.level100 }
  ];

  const closest = distances.reduce((min, curr) => curr.dist < min.dist ? curr : min);

  // Price near 78.6% (deep support)
  if (distToLevel786 < tolerance) {
    return {
      signal: 'STRONG BUY',
      strength: 95,
      entry: fibLevels.level786,
      exit: fibLevels.level500,
      stopLoss: fibLevels.level100,
      reason: 'Price at 78.6% retracement (Deep pullback - Strong Support)'
    };
  }
  // Price near 61.8% (golden ratio)
  else if (distToLevel618 < tolerance) {
    return {
      signal: 'BUY',
      strength: 88,
      entry: fibLevels.level618,
      exit: fibLevels.level382,
      stopLoss: fibLevels.level786,
      reason: 'Price at 61.8% retracement (Golden Ratio - Key Support)'
    };
  }
  // Price near 50% (midpoint)
  else if (distToLevel500 < tolerance) {
    return {
      signal: 'BUY',
      strength: 75,
      entry: fibLevels.level500,
      exit: fibLevels.level236,
      stopLoss: fibLevels.level618,
      reason: 'Price at 50% retracement (Midpoint - Balanced Level)'
    };
  }
  // Price near 38.2%
  else if (distToLevel382 < tolerance) {
    return {
      signal: 'HOLD',
      strength: 65,
      entry: fibLevels.level382,
      exit: fibLevels.level236,
      stopLoss: fibLevels.level500,
      reason: 'Price at 38.2% retracement (Moderate Resistance)'
    };
  }
  // Price near 23.6% (resistance)
  else if (distToLevel236 < tolerance) {
    return {
      signal: 'SELL',
      strength: 82,
      entry: fibLevels.level236,
      exit: fibLevels.level500,
      stopLoss: fibLevels.level0,
      reason: 'Price at 23.6% retracement (Near Resistance)'
    };
  }
  // Price above 23.6% (overbought)
  else if (currentPrice > fibLevels.level236) {
    return {
      signal: 'SELL',
      strength: 78,
      entry: currentPrice,
      exit: fibLevels.level382,
      stopLoss: fibLevels.level0,
      reason: 'Price above 23.6% level (Overbought Zone)'
    };
  }
  // Price below 78.6% (oversold)
  else if (currentPrice < fibLevels.level786) {
    return {
      signal: 'BUY',
      strength: 72,
      entry: currentPrice,
      exit: fibLevels.level618,
      stopLoss: fibLevels.level100,
      reason: 'Price below 78.6% level (Oversold Zone)'
    };
  }
  // Price in middle range (50-61.8%)
  else if (currentPrice >= fibLevels.level618 && currentPrice <= fibLevels.level500) {
    return {
      signal: 'HOLD',
      strength: 60,
      entry: currentPrice,
      exit: fibLevels.level382,
      stopLoss: fibLevels.level786,
      reason: `Price in neutral zone (Near ${closest.level} level)`
    };
  }
  // Price in upper-middle range (38.2-50%)
  else if (currentPrice >= fibLevels.level500 && currentPrice <= fibLevels.level382) {
    return {
      signal: 'HOLD',
      strength: 58,
      entry: currentPrice,
      exit: fibLevels.level236,
      stopLoss: fibLevels.level618,
      reason: `Price approaching resistance (Near ${closest.level} level)`
    };
  }

  return {
    signal: 'NEUTRAL',
    strength: 50,
    entry: currentPrice,
    exit: null,
    stopLoss: null,
    reason: `Price at ${closest.level} - Monitor for breakout`
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
  const [data, setData] = useState(generateSampleData(MARKETS.crypto[0].basePrice, MARKETS.crypto[0].variation));
  const [timeframe, setTimeframe] = useState('1D');
  const [chartType, setChartType] = useState('candlestick');
  const [liveUpdate, setLiveUpdate] = useState(true);
  const [fibonacciLevels, setFibonacciLevels] = useState(null);
  const [fibonacciSignal, setFibonacciSignal] = useState(null);
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [useRealData, setUseRealData] = useState(true);
  const [apiError, setApiError] = useState(null);
  const intervalRef = useRef(null);
  const dataFetchRef = useRef(null);

  // Fetch live data from API
  const fetchLiveData = async (type, symbol) => {
    setIsLoadingData(true);
    setApiError(null);

    try {
      const liveData = await fetchMarketData(type, symbol.symbol);

      if (liveData && liveData.length > 0) {
        setData(liveData);
        updateFibonacciAnalysis(liveData);
        setUseRealData(true);
      } else {
        // Fallback to simulated data
        const fallbackData = generateSampleData(symbol.basePrice, symbol.variation);
        setData(fallbackData);
        updateFibonacciAnalysis(fallbackData);
        setUseRealData(false);
        setApiError('Using simulated data (API limit or no data available)');
      }
    } catch (error) {
      console.error('Error fetching live data:', error);
      // Fallback to simulated data
      const fallbackData = generateSampleData(symbol.basePrice, symbol.variation);
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
      const newData = generateSampleData(newSymbol.basePrice, newSymbol.variation);
      setData(newData);
      updateFibonacciAnalysis(newData);
    }
  };

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);

    if (useRealData) {
      fetchLiveData(marketType, symbol);
    } else {
      const newData = generateSampleData(symbol.basePrice, symbol.variation);
      setData(newData);
      updateFibonacciAnalysis(newData);
    }
  };

  const updateFibonacciAnalysis = (chartData) => {
    const levels = calculateFibonacciLevels(chartData);
    setFibonacciLevels(levels);

    if (levels && chartData.length > 0) {
      const currentPrice = chartData[chartData.length - 1].close;
      const signal = calculateFibonacciSignals(currentPrice, levels);
      setFibonacciSignal(signal);
    }
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
      onFibonacciUpdate(fibonacciLevels, fibonacciSignal);
    }
  }, [fibonacciLevels, fibonacciSignal]);

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
      intervalRef.current = setInterval(() => {
        setData(prevData => {
          const newData = [...prevData];
          const lastCandle = newData[newData.length - 1];

          // Update the last candle with new random values
          const change = (Math.random() - 0.5) * (selectedSymbol.variation / 5);
          const newClose = lastCandle.close + change;
          const newHigh = Math.max(lastCandle.high, newClose);
          const newLow = Math.min(lastCandle.low, newClose);

          newData[newData.length - 1] = {
            ...lastCandle,
            close: parseFloat(newClose.toFixed(selectedSymbol.basePrice < 10 ? 4 : 2)),
            high: parseFloat(newHigh.toFixed(selectedSymbol.basePrice < 10 ? 4 : 2)),
            low: parseFloat(newLow.toFixed(selectedSymbol.basePrice < 10 ? 4 : 2)),
            volume: lastCandle.volume + Math.floor(Math.random() * 10000),
          };

          return newData;
        });
      }, 2000); // Update every 2 seconds
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
    const color = isGreen ? '#26a69a' : '#f23645';
    const ratio = height / (Math.max(...data.map(d => d.high)) - Math.min(...data.map(d => d.low)));

    const minPrice = Math.min(...data.map(d => d.low));

    const yHigh = y + height - (high - minPrice) * ratio;
    const yLow = y + height - (low - minPrice) * ratio;
    const yOpen = y + height - (open - minPrice) * ratio;
    const yClose = y + height - (close - minPrice) * ratio;

    const candleWidth = Math.max(width * 0.7, 1);
    const candleX = x + (width - candleWidth) / 2;

    return (
      <g key={`candle-${index}`}>
        {/* Wick (high-low line) */}
        <line
          x1={x + width / 2}
          y1={yHigh}
          x2={x + width / 2}
          y2={yLow}
          stroke={color}
          strokeWidth={1}
        />

        {/* Candle body */}
        {isGreen ? (
          <rect
            x={candleX}
            y={yClose}
            width={candleWidth}
            height={Math.max(Math.abs(yOpen - yClose), 1)}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
        ) : (
          <rect
            x={candleX}
            y={yOpen}
            width={candleWidth}
            height={Math.max(Math.abs(yClose - yOpen), 1)}
            fill={color}
            stroke={color}
            strokeWidth={1}
          />
        )}
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
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{priceSymbol}{data.open.toLocaleString()}</span>

            <span style={{ color: '#787b86' }}>H</span>
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{priceSymbol}{data.high.toLocaleString()}</span>

            <span style={{ color: '#787b86' }}>L</span>
            <span style={{ textAlign: 'right', color: '#d1d4dc' }}>{priceSymbol}{data.low.toLocaleString()}</span>

            <span style={{ color: '#787b86' }}>C</span>
            <span style={{ textAlign: 'right', color: isGreen ? '#26a69a' : '#f23645', fontWeight: 'bold' }}>
              {priceSymbol}{data.close.toLocaleString()}
            </span>

            <span style={{ color: '#787b86' }}>Change</span>
            <span style={{ textAlign: 'right', color: isGreen ? '#26a69a' : '#f23645' }}>
              {change > 0 ? '+' : ''}{priceSymbol}{change.toFixed(2)} ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
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
            margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
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
              width={60}
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
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
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
                          fibonacciSignal.signal === 'SELL' ? 'rgba(242, 54, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
          border: `2px solid ${fibonacciSignal.signal.includes('BUY') ? '#26a69a' :
                               fibonacciSignal.signal === 'SELL' ? '#f23645' : '#ffc107'}`,
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
                     fibonacciSignal.signal === 'SELL' ? '#f23645' : '#ffc107'
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
                  {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{fibonacciSignal.entry.toFixed(2)}
                </div>
              </div>
            )}
            {fibonacciSignal.exit && (
              <div style={{ padding: '8px', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#787b86', marginBottom: '2px' }}>Target</div>
                <div style={{ fontSize: '14px', color: '#26a69a', fontWeight: 'bold' }}>
                  {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{fibonacciSignal.exit.toFixed(2)}
                </div>
              </div>
            )}
            {fibonacciSignal.stopLoss && (
              <div style={{ padding: '8px', backgroundColor: '#1e222d', borderRadius: '4px' }}>
                <div style={{ fontSize: '10px', color: '#787b86', marginBottom: '2px' }}>Stop Loss</div>
                <div style={{ fontSize: '14px', color: '#f23645', fontWeight: 'bold' }}>
                  {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{fibonacciSignal.stopLoss.toFixed(2)}
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
            {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{data[data.length - 1].close.toLocaleString()}
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
            {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{Math.max(...data.map(d => d.high)).toLocaleString()}
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
            {marketType === 'forex' ? '' : marketType === 'indian_stock' ? '₹' : '$'}{Math.min(...data.map(d => d.low)).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingChart;
