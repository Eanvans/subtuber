export async function getStreamers() {
  const res = await fetch('/api/streamers');
  if (!res.ok) throw new Error('/api/streamers fetch failed');
  const data = await res.json();
  return (data && data.streamers) ? data.streamers : [];
}

export async function getTwitchStatus() {
  const res = await fetch('/api/twitch/status');
  if (!res.ok) throw new Error('/api/twitch/status fetch failed');
  const data = await res.json();
  return data || {};
}

export async function getAnalysis(videoId) {
  if (!videoId) throw new Error('videoId required');
  const res = await fetch(`/api/twitch/analysis/${encodeURIComponent(videoId)}`);
  if (!res.ok) throw new Error(`/api/twitch/analysis/${videoId} fetch failed`);
  const data = await res.json();
  return data || null;
}

export async function getAnalysisSummary(videoId, offsetSeconds) {
  const params = new URLSearchParams();
  if (videoId) params.append('video_id', videoId);
  if (offsetSeconds !== undefined) params.append('offset_seconds', String(offsetSeconds));
  
  const url = `/api/twitch/analysis-summary?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`/api/twitch/analysis-summary fetch failed`);
  const data = await res.json();
  return data && data.summary ? data.summary : null;
}
