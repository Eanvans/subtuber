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
