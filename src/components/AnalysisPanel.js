import React, { useState } from 'react';

const AnalysisPanel = ({ fibonacciLevels, fibonacciSignal }) => {
  const [activeTab, setActiveTab] = useState('fibonacci');

  const technicalIndicators = [
    { name: 'RSI (14)', value: '62.4', signal: 'Neutral', color: '#ffc107' },
    { name: 'MACD (12, 26)', value: '+125.3', signal: 'Buy', color: '#26a69a' },
    { name: 'Moving Avg (50)', value: '49,850', signal: 'Buy', color: '#26a69a' },
    { name: 'Moving Avg (200)', value: '48,200', signal: 'Buy', color: '#26a69a' },
    { name: 'Bollinger Bands', value: 'Upper', signal: 'Sell', color: '#ef5350' },
    { name: 'Stochastic', value: '45.2', signal: 'Neutral', color: '#ffc107' },
  ];

  const orderBook = [
    { price: 50250, amount: 0.5234, total: 26289 },
    { price: 50225, amount: 1.2456, total: 62560 },
    { price: 50200, amount: 0.8901, total: 44684 },
    { price: 50175, amount: 2.1234, total: 106525 },
    { price: 50150, amount: 0.6789, total: 34037 },
  ];

  const recentTrades = [
    { time: '14:32:45', price: 50230, amount: 0.125, type: 'buy' },
    { time: '14:32:42', price: 50225, amount: 0.350, type: 'sell' },
    { time: '14:32:38', price: 50240, amount: 0.089, type: 'buy' },
    { time: '14:32:35', price: 50235, amount: 0.567, type: 'buy' },
    { time: '14:32:30', price: 50220, amount: 0.234, type: 'sell' },
  ];

  const marketStats = [
    { label: 'Market Cap', value: '$950.2B' },
    { label: '24h Volume', value: '$32.4B' },
    { label: 'Circulating Supply', value: '19.2M BTC' },
    { label: 'All-Time High', value: '$69,000' },
  ];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #333',
        marginBottom: '20px'
      }}>
        {['fibonacci', 'indicators', 'orderbook', 'trades', 'stats'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: 'transparent',
              color: activeTab === tab ? '#2196f3' : '#999',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #2196f3' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              textTransform: 'capitalize',
              transition: 'all 0.3s'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
        {activeTab === 'fibonacci' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>
              Fibonacci Analysis
            </h3>

            {fibonacciSignal && (
              <div style={{
                marginBottom: '25px',
                padding: '20px',
                backgroundColor: fibonacciSignal.signal.includes('BUY') ? 'rgba(38, 166, 154, 0.15)' :
                                fibonacciSignal.signal === 'SELL' ? 'rgba(242, 54, 69, 0.15)' :
                                fibonacciSignal.signal === 'HOLD' ? 'rgba(41, 98, 255, 0.15)' : 'rgba(255, 193, 7, 0.15)',
                border: `2px solid ${fibonacciSignal.signal.includes('BUY') ? '#26a69a' :
                                     fibonacciSignal.signal === 'SELL' ? '#f23645' :
                                     fibonacciSignal.signal === 'HOLD' ? '#2962ff' : '#ffc107'}`,
                borderRadius: '10px'
              }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px', letterSpacing: '1px' }}>TRADING SIGNAL</div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  color: fibonacciSignal.signal.includes('BUY') ? '#26a69a' :
                         fibonacciSignal.signal === 'SELL' ? '#f23645' :
                         fibonacciSignal.signal === 'HOLD' ? '#2962ff' : '#ffc107'
                }}>
                  {fibonacciSignal.signal}
                </div>
                <div style={{ fontSize: '14px', color: '#d1d4dc', marginBottom: '15px', lineHeight: '1.6' }}>
                  {fibonacciSignal.reason}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderRadius: '6px'
                }}>
                  <div style={{ color: '#999', fontSize: '13px' }}>Signal Strength:</div>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${fibonacciSignal.strength}%`,
                      height: '100%',
                      backgroundColor: fibonacciSignal.strength > 80 ? '#26a69a' :
                                      fibonacciSignal.strength > 60 ? '#ffc107' : '#f23645',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold', minWidth: '45px' }}>
                    {fibonacciSignal.strength}%
                  </div>
                </div>
              </div>
            )}

            {fibonacciLevels && (
              <div>
                <h4 style={{ color: '#fff', marginBottom: '15px', fontSize: '16px' }}>Retracement Levels</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { name: '0% (High)', value: fibonacciLevels.level0, color: '#ff6b6b', level: '0.0%' },
                    { name: '23.6%', value: fibonacciLevels.level236, color: '#ffd93d', level: '23.6%' },
                    { name: '38.2%', value: fibonacciLevels.level382, color: '#6bcf7f', level: '38.2%' },
                    { name: '50%', value: fibonacciLevels.level500, color: '#2962ff', level: '50.0%' },
                    { name: '61.8% (Golden)', value: fibonacciLevels.level618, color: '#c77dff', level: '61.8%' },
                    { name: '78.6%', value: fibonacciLevels.level786, color: '#ff9ff3', level: '78.6%' },
                    { name: '100% (Low)', value: fibonacciLevels.level100, color: '#26a69a', level: '100%' },
                  ].map((level, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '15px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderLeft: `4px solid ${level.color}`,
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.3s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)'}
                    >
                      <div>
                        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>
                          {level.name}
                        </div>
                        <div style={{ color: '#999', fontSize: '12px' }}>
                          Retracement: {level.level}
                        </div>
                      </div>
                      <div style={{
                        color: level.color,
                        fontSize: '18px',
                        fontWeight: 'bold',
                        fontFamily: 'monospace'
                      }}>
                        {level.value.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: 'rgba(41, 98, 255, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(41, 98, 255, 0.3)'
                }}>
                  <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>Trading Zones</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#26a69a', borderRadius: '2px' }} />
                      <span style={{ color: '#d1d4dc' }}>Strong Support: 61.8% - 100%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#2962ff', borderRadius: '2px' }} />
                      <span style={{ color: '#d1d4dc' }}>Neutral Zone: 38.2% - 61.8%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: '#ff6b6b', borderRadius: '2px' }} />
                      <span style={{ color: '#d1d4dc' }}>Resistance: 0% - 38.2%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'indicators' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>
              Technical Indicators
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {technicalIndicators.map((indicator, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '15px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                      {indicator.name}
                    </div>
                    <div style={{ color: '#999', fontSize: '14px' }}>
                      Value: {indicator.value}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '6px 12px',
                      backgroundColor: indicator.color,
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#000'
                    }}
                  >
                    {indicator.signal}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '5px' }}>
                Overall Signal
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#26a69a' }}>
                BULLISH
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orderbook' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>
              Order Book
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              marginBottom: '10px',
              fontSize: '12px',
              color: '#999',
              fontWeight: 'bold'
            }}>
              <div>Price (USD)</div>
              <div style={{ textAlign: 'right' }}>Amount (BTC)</div>
              <div style={{ textAlign: 'right' }}>Total (USD)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {orderBook.map((order, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: 'rgba(38, 166, 154, 0.05)',
                    borderRadius: '4px',
                    border: '1px solid rgba(38, 166, 154, 0.2)',
                    fontSize: '14px'
                  }}
                >
                  <div style={{ color: '#26a69a', fontWeight: 'bold' }}>
                    ${order.price.toLocaleString()}
                  </div>
                  <div style={{ textAlign: 'right', color: '#fff' }}>
                    {order.amount.toFixed(4)}
                  </div>
                  <div style={{ textAlign: 'right', color: '#999' }}>
                    ${order.total.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>
              Recent Trades
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '10px',
              marginBottom: '10px',
              fontSize: '12px',
              color: '#999',
              fontWeight: 'bold'
            }}>
              <div>Time</div>
              <div style={{ textAlign: 'right' }}>Price (USD)</div>
              <div style={{ textAlign: 'right' }}>Amount (BTC)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentTrades.map((trade, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '10px',
                    padding: '12px',
                    backgroundColor: trade.type === 'buy'
                      ? 'rgba(38, 166, 154, 0.05)'
                      : 'rgba(239, 83, 80, 0.05)',
                    borderRadius: '4px',
                    border: trade.type === 'buy'
                      ? '1px solid rgba(38, 166, 154, 0.2)'
                      : '1px solid rgba(239, 83, 80, 0.2)',
                    fontSize: '14px'
                  }}
                >
                  <div style={{ color: '#999' }}>{trade.time}</div>
                  <div style={{
                    textAlign: 'right',
                    color: trade.type === 'buy' ? '#26a69a' : '#ef5350',
                    fontWeight: 'bold'
                  }}>
                    ${trade.price.toLocaleString()}
                  </div>
                  <div style={{ textAlign: 'right', color: '#fff' }}>
                    {trade.amount.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#fff' }}>
              Market Statistics
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {marketStats.map((stat, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid #333'
                  }}
                >
                  <div style={{ color: '#999', fontSize: '14px', marginBottom: '8px' }}>
                    {stat.label}
                  </div>
                  <div style={{ color: '#fff', fontSize: '24px', fontWeight: 'bold' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
