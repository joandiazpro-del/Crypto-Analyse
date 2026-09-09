import React from 'react';
import CandlestickChart from '../CandlestickChart';
import OrderBook from '../OrderBook';
import TradesFeed from '../TradesFeed';
import IndicatorsPanel from '../IndicatorsPanel';

export default function TradingTab({ klines, selectedCoin, loading, indicators, liveKline, chartType, orderBook, trades, currentTicker }) {
  return (
    <div className="trading-tab">
      <div className="trading-chart-side">
        <div className="chart-area">
          <CandlestickChart
            key={`${selectedCoin.id}-${chartType}`}
            klines={klines}
            symbol={selectedCoin.id}
            loading={loading}
            indicators={indicators}
            liveKline={liveKline}
            chartType={chartType}
          />
        </div>
        <div className="indicators-area">
          <IndicatorsPanel indicators={indicators} loading={loading} />
        </div>
      </div>
      <div className="trading-right-side">
        <OrderBook orderBook={orderBook} price={currentTicker?.price} />
        <TradesFeed trades={trades} />
      </div>
    </div>
  );
}
