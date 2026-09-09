import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, RefreshCw, TrendingUp, TrendingDown, Minus, ExternalLink, Brain, Zap } from 'lucide-react';
import { api } from '../../utils/api';

const SENTIMENT_COLORS = {
  very_bullish: { color: '#00e676', bg: 'rgba(0,230,118,0.1)',  label: 'Très Bullish' },
  bullish:      { color: '#00d4ff', bg: 'rgba(0,212,255,0.1)',  label: 'Bullish'      },
  neutral:      { color: '#7a92a8', bg: 'rgba(122,146,168,0.1)',label: 'Neutre'       },
  bearish:      { color: '#ff9f43', bg: 'rgba(255,159,67,0.1)', label: 'Bearish'      },
  very_bearish: { color: '#ff4757', bg: 'rgba(255,71,87,0.1)',  label: 'Très Bearish' },
};

function timeAgo(isoDate) {
  const diff = (Date.now() - new Date(isoDate)) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

export default function NewsTab({ selectedCoin, onSentimentChange }) {
  const [news, setNews]           = useState([]);
  const [sentiment, setSentiment] = useState(null);
  const [loadingNews, setLoadingNews]         = useState(false);
  const [loadingSentiment, setLoadingSentiment] = useState(false);
  const [filter, setFilter]       = useState('all');
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchNews = useCallback(async () => {
    setLoadingNews(true);
    try {
      const data = await api.get(`/news/${selectedCoin.id}`);
      setNews(data);
      setLastRefresh(Date.now());
    } catch (e) {
      console.error('News error:', e);
    } finally {
      setLoadingNews(false);
    }
  }, [selectedCoin]);

  const fetchSentiment = useCallback(async (newsItems) => {
    if (!newsItems.length) return;
    setLoadingSentiment(true);
    try {
      const data = await api.post('/news/sentiment', { symbol: selectedCoin.id, newsItems: newsItems.slice(0, 10) });
      setSentiment(data);
      onSentimentChange?.(data);
    } catch (e) {
      console.error('Sentiment error:', e);
    } finally {
      setLoadingSentiment(false);
    }
  }, [selectedCoin, onSentimentChange]);

  // Chargement initial + rafraîchissement toutes les 5 min
  useEffect(() => {
    setSentiment(null);
    setNews([]);
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    const id = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchNews]);

  // Analyse sentiment automatique quand les news chargent
  useEffect(() => {
    if (news.length > 0 && !sentiment) fetchSentiment(news);
  }, [news, sentiment, fetchSentiment]);

  const sc = sentiment ? (SENTIMENT_COLORS[sentiment.label] ?? SENTIMENT_COLORS.neutral) : null;

  const filteredNews = filter === 'all' ? news : news.slice(0, 10);

  return (
    <div className="news-tab">

      {/* Header */}
      <div className="news-header">
        <div className="news-header-left">
          <Newspaper size={14} color="var(--accent)" />
          <span className="news-title">News — {selectedCoin.name}</span>
          {lastRefresh && (
            <span className="news-refresh-time">mis à jour {timeAgo(new Date(lastRefresh).toISOString())}</span>
          )}
        </div>
        <div className="news-header-right">
          <div className="news-filter-btns">
            <button className={`news-filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Toutes</button>
            <button className={`news-filter-btn ${filter === 'top' ? 'active' : ''}`} onClick={() => setFilter('top')}>Top 10</button>
          </div>
          <button
            className="news-refresh-btn"
            onClick={() => { fetchNews(); setSentiment(null); }}
            disabled={loadingNews}
            title="Rafraîchir"
          >
            <RefreshCw size={12} className={loadingNews ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="news-body">
        {/* Bloc sentiment */}
        <div className="sentiment-card">
          <div className="sentiment-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Brain size={13} color="var(--accent)" />
              <span className="sentiment-title">Analyse de Sentiment (Claude)</span>
            </div>
            <button
              className="sentiment-refresh-btn"
              onClick={() => fetchSentiment(news)}
              disabled={loadingSentiment || !news.length}
            >
              {loadingSentiment ? <><div className="spinner" style={{ width: 8, height: 8, borderWidth: 1 }} /> Analyse...</> : <><RefreshCw size={10} /> Ré-analyser</>}
            </button>
          </div>

          {loadingSentiment && !sentiment && (
            <div className="sentiment-loading"><div className="spinner" /><span>Claude analyse les headlines...</span></div>
          )}

          {sentiment && sc && (
            <div className="sentiment-result" style={{ borderColor: sc.color + '40', background: sc.bg }}>
              {/* Score */}
              <div className="sentiment-score-row">
                <div className="sentiment-score-bar-wrap">
                  <div className="sentiment-score-bar">
                    <div
                      className="sentiment-score-fill"
                      style={{
                        width: `${Math.abs(sentiment.score)}%`,
                        background: sc.color,
                        marginLeft: sentiment.score < 0 ? `${50 - Math.abs(sentiment.score) / 2}%` : '50%',
                      }}
                    />
                    <div className="sentiment-score-mid" />
                  </div>
                  <div className="sentiment-score-labels">
                    <span style={{ color: '#ff4757' }}>-100</span>
                    <span style={{ color: '#7a92a8' }}>0</span>
                    <span style={{ color: '#00e676' }}>+100</span>
                  </div>
                </div>
                <div className="sentiment-score-value" style={{ color: sc.color }}>
                  {sentiment.score > 0 ? '+' : ''}{sentiment.score}
                </div>
              </div>

              {/* Label */}
              <div className="sentiment-label" style={{ color: sc.color }}>{sc.label}</div>

              {/* Thème */}
              {sentiment.keyTheme && (
                <div className="sentiment-theme"><Zap size={10} color="var(--yellow)" /> {sentiment.keyTheme}</div>
              )}

              {/* Résumé */}
              <p className="sentiment-summary">{sentiment.summary}</p>

              {/* Top bullish / bearish */}
              <div className="sentiment-tops">
                {sentiment.topBullish && (
                  <div className="sentiment-top-item pos">
                    <TrendingUp size={10} />
                    <span>{sentiment.topBullish}</span>
                  </div>
                )}
                {sentiment.topBearish && (
                  <div className="sentiment-top-item neg">
                    <TrendingDown size={10} />
                    <span>{sentiment.topBearish}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!sentiment && !loadingSentiment && !news.length && (
            <div className="sentiment-loading"><Minus size={14} color="var(--text-muted)" /><span>Aucune news disponible</span></div>
          )}
        </div>

        {/* Liste news */}
        <div className="news-list">
          {loadingNews && !news.length && (
            <div className="news-loading"><div className="spinner" /><span>Chargement des news...</span></div>
          )}

          {!loadingNews && !news.length && (
            <div className="news-loading">
              <Newspaper size={20} color="var(--text-muted)" />
              <span>Aucune news trouvée pour {selectedCoin.name}</span>
            </div>
          )}

          {filteredNews.map((item, i) => (
            <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="news-item">
              <div className="news-item-header">
                <span className="news-source">{item.source}</span>
                <span className="news-date">{timeAgo(item.date)}</span>
                <ExternalLink size={10} color="var(--text-muted)" />
              </div>
              <div className="news-item-title">{item.title}</div>
              {item.summary && <div className="news-item-summary">{item.summary}</div>}
            </a>
          ))}
        </div>
      </div>

      <style>{`
        .news-tab { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-primary); }

        /* Header */
        .news-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; border-bottom: 1px solid var(--border);
          background: var(--bg-secondary); flex-shrink: 0;
        }
        .news-header-left { display: flex; align-items: center; gap: 8px; }
        .news-header-right { display: flex; align-items: center; gap: 8px; }
        .news-title { font-size: 12px; font-weight: 700; color: var(--text-primary); font-family: var(--font-mono); }
        .news-refresh-time { font-size: 10px; color: var(--text-muted); }
        .news-filter-btns { display: flex; gap: 2px; }
        .news-filter-btn { padding: 3px 8px; font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all 0.15s; }
        .news-filter-btn.active { color: var(--accent); border-color: rgba(0,212,255,0.4); background: var(--accent-dim); }
        .news-refresh-btn { display: flex; align-items: center; padding: 4px; color: var(--text-muted); border-radius: 4px; transition: all 0.15s; }
        .news-refresh-btn:hover:not(:disabled) { color: var(--accent); background: var(--bg-hover); }
        .news-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        /* Body */
        .news-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 320px 1fr; overflow: hidden; }

        /* Sentiment */
        .sentiment-card { border-right: 1px solid var(--border); padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; background: var(--bg-secondary); }
        .sentiment-card-header { display: flex; align-items: center; justify-content: space-between; }
        .sentiment-title { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.07em; }
        .sentiment-refresh-btn { display: flex; align-items: center; gap: 4px; padding: 3px 7px; font-size: 10px; color: var(--text-muted); border: 1px solid var(--border); border-radius: 4px; background: transparent; cursor: pointer; transition: all 0.15s; }
        .sentiment-refresh-btn:hover:not(:disabled) { color: var(--accent); }
        .sentiment-refresh-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .sentiment-loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0; color: var(--text-muted); font-size: 11px; }
        .sentiment-result { border: 1px solid; border-radius: var(--radius); padding: 10px; display: flex; flex-direction: column; gap: 8px; }
        .sentiment-score-row { display: flex; align-items: center; gap: 10px; }
        .sentiment-score-bar-wrap { flex: 1; }
        .sentiment-score-bar { height: 6px; background: var(--bg-card); border-radius: 3px; position: relative; overflow: hidden; margin-bottom: 3px; }
        .sentiment-score-fill { height: 100%; border-radius: 3px; transition: all 0.5s; }
        .sentiment-score-mid { position: absolute; left: 50%; top: 0; width: 1px; height: 100%; background: var(--border); }
        .sentiment-score-labels { display: flex; justify-content: space-between; font-size: 9px; font-family: var(--font-mono); }
        .sentiment-score-value { font-size: 20px; font-weight: 700; font-family: var(--font-mono); min-width: 50px; text-align: right; }
        .sentiment-label { font-size: 12px; font-weight: 700; }
        .sentiment-theme { display: flex; align-items: center; gap: 4px; font-size: 10px; color: var(--yellow); font-style: italic; }
        .sentiment-summary { font-size: 11px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
        .sentiment-tops { display: flex; flex-direction: column; gap: 4px; }
        .sentiment-top-item { display: flex; align-items: flex-start; gap: 5px; font-size: 10px; line-height: 1.4; padding: 4px 6px; border-radius: 4px; }
        .sentiment-top-item.pos { color: var(--green); background: rgba(0,230,118,0.06); }
        .sentiment-top-item.neg { color: var(--red); background: rgba(255,71,87,0.06); }
        .sentiment-top-item svg { flex-shrink: 0; margin-top: 1px; }

        /* Liste */
        .news-list { overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .news-loading { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px 0; color: var(--text-muted); font-size: 12px; }
        .news-item { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius); text-decoration: none; transition: all 0.15s; }
        .news-item:hover { border-color: rgba(0,212,255,0.3); background: var(--bg-hover); }
        .news-item-header { display: flex; align-items: center; gap: 6px; }
        .news-source { font-size: 9px; font-weight: 700; color: var(--accent); text-transform: uppercase; letter-spacing: 0.07em; font-family: var(--font-mono); }
        .news-date { font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); margin-left: auto; }
        .news-item-title { font-size: 12px; color: var(--text-primary); line-height: 1.5; font-weight: 500; }
        .news-item-summary { font-size: 10px; color: var(--text-muted); line-height: 1.4; }
      `}</style>
    </div>
  );
}
