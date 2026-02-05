import React, { useState, useCallback } from 'react';
import './App.css';
import TradingChart from './components/TradingChart';
import AnalysisPanel from './components/AnalysisPanel';

function App() {
  const [fibonacciData, setFibonacciData] = useState({ levels: null, signal: null });

  const handleFibonacciUpdate = useCallback((levels, signal) => {
    setFibonacciData(prev => {
      // Only update if data actually changed
      if (JSON.stringify(prev.levels) === JSON.stringify(levels) &&
          JSON.stringify(prev.signal) === JSON.stringify(signal)) {
        return prev;
      }
      return { levels, signal };
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
