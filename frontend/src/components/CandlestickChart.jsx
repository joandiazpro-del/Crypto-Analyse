import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

export default function CandlestickChart({ klines, symbol, loading, indicators, liveKline, chartType = 'candle' }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const mainSeriesRef = useRef(null);
  const volRef = useRef(null);
  const ema9Ref = useRef(null);
  const ema21Ref = useRef(null);
  const sma50Ref = useRef(null);
  const bbUpperRef = useRef(null);
  const bbLowerRef = useRef(null);
  const bbMidRef = useRef(null);

  // Création du chart — une seule fois par montage (key={coin} force le remount au changement de coin)
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#080b0f' },
        textColor: '#7a92a8',
        fontSize: 11,
        fontFamily: "'Space Mono', monospace"
      },
      grid: {
        vertLines: { color: '#0e1318' },
        horzLines: { color: '#0e1318' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#2a3f52', style: 3 },
        horzLine: { color: '#2a3f52', style: 3 }
      },
      rightPriceScale: {
        borderColor: '#1e2d3d',
        scaleMargins: { top: 0.1, bottom: 0.25 }
      },
      timeScale: {
        borderColor: '#1e2d3d',
        timeVisible: true,
        secondsVisible: false
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight
    });

    let mainSeries;
    if (chartType === 'line') {
      mainSeries = chart.addAreaSeries({
        lineColor: '#00d4ff',
        topColor: 'rgba(0, 212, 255, 0.18)',
        bottomColor: 'rgba(0, 212, 255, 0.0)',
        lineWidth: 2,
        priceScaleId: 'right',
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
      });
    } else {
      mainSeries = chart.addCandlestickSeries({
        upColor: '#00e676',
        downColor: '#ff4757',
        borderUpColor: '#00e676',
        borderDownColor: '#ff4757',
        wickUpColor: '#00a854',
        wickDownColor: '#cc2233',
        priceScaleId: 'right'
      });
    }

    const volSeries = chart.addHistogramSeries({
      color: '#1e2d3d',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    const ema9Series  = chart.addLineSeries({ color: '#00d4ff', lineWidth: 1, title: 'EMA9',   priceLineVisible: false });
    const ema21Series = chart.addLineSeries({ color: '#ff9f43', lineWidth: 1, title: 'EMA21',  priceLineVisible: false });
    const sma50Series = chart.addLineSeries({ color: '#a29bfe', lineWidth: 1, title: 'SMA50',  priceLineVisible: false });
    const bbUpperSeries = chart.addLineSeries({ color: 'rgba(0,212,255,0.3)', lineWidth: 1, lineStyle: 2, title: 'BB+',    priceLineVisible: false });
    const bbLowerSeries = chart.addLineSeries({ color: 'rgba(0,212,255,0.3)', lineWidth: 1, lineStyle: 2, title: 'BB-',    priceLineVisible: false });
    const bbMidSeries   = chart.addLineSeries({ color: 'rgba(0,212,255,0.15)', lineWidth: 1, lineStyle: 3, title: 'BB mid', priceLineVisible: false });

    chartRef.current   = chart;
    mainSeriesRef.current = mainSeries;
    volRef.current     = volSeries;
    ema9Ref.current    = ema9Series;
    ema21Ref.current   = ema21Series;
    sma50Ref.current   = sma50Series;
    bbUpperRef.current = bbUpperSeries;
    bbLowerRef.current = bbLowerSeries;
    bbMidRef.current   = bbMidSeries;

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    });
    ro.observe(containerRef.current);

    return () => { ro.disconnect(); chart.remove(); };
  }, []); // chart créé une seule fois, key={coin-type} gère le remount

  // Chargement initial des klines
  useEffect(() => {
    if (!klines.length || !mainSeriesRef.current) return;

    if (chartType === 'line') {
      mainSeriesRef.current.setData(
        klines.map(k => ({ time: Math.floor(k.openTime / 1000), value: k.close }))
      );
    } else {
      mainSeriesRef.current.setData(
        klines.map(k => ({ time: Math.floor(k.openTime / 1000), open: k.open, high: k.high, low: k.low, close: k.close }))
      );
    }

    volRef.current.setData(
      klines.map(k => ({
        time: Math.floor(k.openTime / 1000),
        value: k.volume,
        color: k.close >= k.open ? 'rgba(0,230,118,0.25)' : 'rgba(255,71,87,0.25)'
      }))
    );

    // Bollinger Bands
    const closes = klines.map(k => k.close);
    const period = 20;
    const bbUpper = [], bbLower = [], bbMid = [];
    for (let i = period - 1; i < closes.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const std  = Math.sqrt(slice.map(v => (v - mean) ** 2).reduce((a, b) => a + b, 0) / period);
      const t = Math.floor(klines[i].openTime / 1000);
      bbUpper.push({ time: t, value: mean + 2 * std });
      bbLower.push({ time: t, value: mean - 2 * std });
      bbMid.push({ time: t, value: mean });
    }
    bbUpperRef.current.setData(bbUpper);
    bbLowerRef.current.setData(bbLower);
    bbMidRef.current.setData(bbMid);

    // EMA / SMA
    const ema9  = computeEMA(closes, 9);
    const ema21 = computeEMA(closes, 21);
    const sma50 = computeSMA(closes, 50);
    const mapLine = (values, offset) => values.map((v, i) => ({ time: Math.floor(klines[i + offset].openTime / 1000), value: v }));
    ema9Ref.current.setData(mapLine(ema9,  klines.length - ema9.length));
    ema21Ref.current.setData(mapLine(ema21, klines.length - ema21.length));
    sma50Ref.current.setData(mapLine(sma50, klines.length - sma50.length));

    chartRef.current?.timeScale().fitContent();
  }, [klines, chartType]);

  // Mise à jour temps réel de la bougie/ligne courante
  useEffect(() => {
    if (!liveKline || !mainSeriesRef.current || !klines.length) return;
    const t = Math.floor(liveKline.openTime / 1000);
    if (chartType === 'line') {
      mainSeriesRef.current.update({ time: t, value: liveKline.close });
    } else {
      mainSeriesRef.current.update({ time: t, open: liveKline.open, high: liveKline.high, low: liveKline.low, close: liveKline.close });
    }
    volRef.current?.update({
      time: t,
      value: liveKline.volume,
      color: liveKline.close >= liveKline.open ? 'rgba(0,230,118,0.25)' : 'rgba(255,71,87,0.25)'
    });
    // Scroll vers le dernier point (utile quand il y a un gap — ex: CoinGecko)
    chartRef.current?.timeScale().scrollToRealTime();
  }, [liveKline, chartType]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {loading && (
        <div className="loading-overlay" style={{ position: 'absolute', zIndex: 10 }}>
          <div className="spinner" />
          <span>Chargement des données...</span>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 8, zIndex: 5 }}>
        {chartType === 'line' ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7a92a8' }}>
            <span style={{ width: 16, height: 2, background: '#00d4ff', display: 'inline-block' }} />
            Prix
          </span>
        ) : (
          [
            { color: '#00d4ff', label: 'EMA9' },
            { color: '#ff9f43', label: 'EMA21' },
            { color: '#a29bfe', label: 'SMA50' },
            { color: 'rgba(0,212,255,0.5)', label: 'BB', dashed: true }
          ].map(({ color, label, dashed }) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#7a92a8' }}>
              <span style={{ width: 16, height: 2, background: color, display: 'inline-block', borderTop: dashed ? `1px dashed ${color}` : 'none' }} />
              {label}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

function computeEMA(values, period) {
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result = [];
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function computeSMA(values, period) {
  const result = [];
  for (let i = period - 1; i < values.length; i++) {
    result.push(values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period);
  }
  return result;
}
