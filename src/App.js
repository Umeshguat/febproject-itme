import React, { useState, useCallback } from 'react';
import './App.css';
import TradingChart from './components/TradingChart';
import AnalysisPanel from './components/AnalysisPanel';

function App() {
  const [fibonacciData, setFibonacciData] = useState({ levels: null, signal: null, marketType: 'crypto', indicators: null });

  const handleFibonacciUpdate = useCallback((levels, signal, marketType, indicators) => {
    setFibonacciData({ levels, signal, marketType, indicators });
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
            indicators={fibonacciData.indicators}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
