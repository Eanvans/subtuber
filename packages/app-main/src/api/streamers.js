export async function getStreamers() {
  const res = await fetch('/api/streamers');
  if (!res.ok) throw new Error('/api/streamers fetch failed');
  const data = await res.json();
  return (data && data.streamers) ? data.streamers : [];
}

export async function getStreamerVODs(streamerId) {
  if (!streamerId) throw new Error('streamerId required');
  const res = await fetch(`/api/streamers/${encodeURIComponent(streamerId)}`);
  if (!res.ok) throw new Error(`/api/streamers/${streamerId} fetch failed`);
  const data = await res.json();
  return (data && data.vods) ? data.vods : [];
}

export async function getTwitchStatus(streamerId) {
  if (!streamerId) {
    const res = await fetch('/api/twitch/status');
    if (!res.ok) throw new Error('/api/twitch/status fetch failed');
    const data = await res.json();
    return data || {};
  }
  
  const res = await fetch(`/api/twitch/status/${encodeURIComponent(streamerId)}`);
  if (!res.ok) throw new Error(`/api/twitch/status/${streamerId} fetch failed`);
  const data = await res.json();
  return data || {};
}

export async function getAnalysis(videoId, windowsLen, thr, searchRange) {
  if (!videoId) throw new Error('videoId required');
  
  const params = new URLSearchParams();
  if (windowsLen !== undefined) params.append('windows_len', String(windowsLen));
  if (thr !== undefined) params.append('thr', String(thr));
  if (searchRange !== undefined) params.append('search_range', String(searchRange));
  
  const queryString = params.toString();
  const url = `/api/twitch/analysis/${encodeURIComponent(videoId)}${queryString ? '?' + queryString : ''}`;
  
  const res = await fetch(url);
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

export async function subscribeStreamer(streamerData) {
  const res = await fetch('/api/streamers/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(streamerData)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || '订阅主播失败');
  }
  
  return await res.json();
}
