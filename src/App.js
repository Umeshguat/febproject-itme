import React, { useState, useCallback } from 'react';
import './App.css';
import TradingChart from './components/TradingChart';
import AnalysisPanel from './components/AnalysisPanel';

function App() {
  const [fibonacciData, setFibonacciData] = useState({ levels: null, signal: null, marketType: 'crypto' });

  const handleFibonacciUpdate = useCallback((levels, signal, marketType) => {
    setFibonacciData(prev => {
      if (JSON.stringify(prev.levels) === JSON.stringify(levels) &&
          JSON.stringify(prev.signal) === JSON.stringify(signal) &&
          prev.marketType === marketType) {
        return prev;
      }
      return { levels, signal, marketType };
    });
  }, []);

  return (
    <div className="App">
      <div className="trading-dashboard">
        <div className="chart-section">
          <TradingChart onFibonacciUpdate={handleFibonacciUpdate} />
        </div>
        <div className="analysis-section">
          <AnalysisPanel
            fibonacciLevels={fibonacciData.levels}
            fibonacciSignal={fibonacciData.signal}
            marketType={fibonacciData.marketType}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
