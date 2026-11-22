export async function getStreamers() {
  const res = await fetch('/api/streamers');
  if (!res.ok) throw new Error('/api/streamers fetch failed');
  const data = await res.json();
  return (data && data.streamers) ? data.streamers : [];
}

export async function getStreamerVODs(streamerId, options = {}) {
  if (!streamerId) throw new Error('streamerId required');

  const params = new URLSearchParams();
  if (options.limit !== undefined && options.limit !== null) {
    params.append('limit', String(options.limit));
  }
  if (options.offset !== undefined && options.offset !== null) {
    params.append('offset', String(options.offset));
  }

  const queryString = params.toString();
  const url = `/api/streamers/${encodeURIComponent(streamerId)}${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`/api/streamers/${streamerId} fetch failed`);
  const data = await res.json();
  const vods = Array.isArray(data) ? data : ((data && data.vods) ? data.vods : []);

  return {
    vods,
    hasMore: typeof data?.has_more === 'boolean' ? data.has_more : null,
    nextOffset: typeof data?.next_offset === 'number' ? data.next_offset : null,
    total: typeof data?.total === 'number' ? data.total : null
  };
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

export async function getStreamingStatus(streamerId) {
  if (!streamerId) {
    throw new Error('/api/streaming/status fetch failed, no streamer id');
  }
  
  const res = await fetch(`/api/streaming/status/${encodeURIComponent(streamerId)}`);
  if (!res.ok) throw new Error(`/api/streaming/status/${streamerId} fetch failed`);
  const data = await res.json();
  return data || {};
}

export async function getAnalysis(videoId, windowsLen, thr, searchRange, options = {}) {
  if (!videoId) throw new Error('videoId required');
  
  const params = new URLSearchParams();
  if (windowsLen !== undefined) params.append('windows_len', String(windowsLen));
  if (thr !== undefined) params.append('thr', String(thr));
  if (searchRange !== undefined) params.append('search_range', String(searchRange));
  if (options.includeTimeSeries !== undefined) {
    params.append('include_time_series', String(Boolean(options.includeTimeSeries)));
  }
  if (options.timeSeriesOffset !== undefined && options.timeSeriesOffset !== null) {
    params.append('time_series_offset', String(options.timeSeriesOffset));
  }
  if (options.timeSeriesLimit !== undefined && options.timeSeriesLimit !== null) {
    params.append('time_series_limit', String(options.timeSeriesLimit));
  }
  
  const queryString = params.toString();
  const url = `/api/twitch/analysis/${encodeURIComponent(videoId)}${queryString ? '?' + queryString : ''}`;
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`/api/twitch/analysis/${videoId} fetch failed`);
  const data = await res.json();
  return data || null;
}

export async function getRecordingClipReports(videoId, platform) {
  if (!videoId) throw new Error('videoId required');
  const query = new URLSearchParams({ platform });
  return requestJson(`/api/recordings/${encodeURIComponent(videoId)}/clip-reports?${query}`, {}, '回放片段报告加载失败');
}

export async function subscribeStreamer(streamerData, { signal } = {}) {
  const res = await fetch('/api/streamers/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(streamerData),
    signal
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || '订阅主播失败');
  }
  
  return await res.json();
}

// 订阅管理相关 API
export async function checkSubscription(streamerId) {
  if (!streamerId) throw new Error('streamerId required');
  const res = await fetch(`/api/user/subscriptions/check?streamer_id=${encodeURIComponent(streamerId)}`);
  if (!res.ok) throw new Error('Check subscription failed');
  const data = await res.json();
  return data.subscribed || false;
}

export async function subscribe(streamerId) {
  if (!streamerId) throw new Error('streamerId required');
  const res = await fetch('/api/user/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streamer_id: streamerId })
  });
  if (!res.ok) throw new Error('Subscribe failed');
  return res.json();
}

export async function unsubscribe(streamerId) {
  if (!streamerId) throw new Error('streamerId required');
  const res = await fetch(`/api/user/subscriptions`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streamer_id: streamerId })
  });
  if (!res.ok) throw new Error('Unsubscribe failed');
  return res.json();
}

async function requestJson(url, options = {}, defaultError = '请求失败') {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = defaultError;
    try {
      const errorData = await res.json();
      message = errorData.message || errorData.error || message;
    } catch (e) {
      // ignore JSON parse errors and keep the default fallback
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.headers.get('content-type')?.includes('application/json') ? res.json() : null;
}

export async function summarizeStreamer(streamerId, payload = {}) {
  if (!streamerId) throw new Error('streamerId required');
  return requestJson(`/api/streamers/${encodeURIComponent(streamerId)}/resummarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '重新生成主播摘要失败');
}

export async function analyzeClipReport(payload = {}) {
  return requestJson('/api/clip-reports/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '提交分析失败');
}

export async function getClipReportStatus(reportId) {
  if (!reportId) throw new Error('reportId required');
  return requestJson(`/api/clip-reports/${encodeURIComponent(reportId)}/status`, {
    method: 'GET'
  }, '查询分析状态失败');
}

export async function getClipReportsMarketplace(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  const url = `/api/clip-reports/marketplace${query.toString() ? `?${query.toString()}` : ''}`;
  return requestJson(url, { method: 'GET' }, '获取市场报告失败');
}

export async function getClipReportDetail(reportId) {
  if (!reportId) throw new Error('reportId required');
  return requestJson(`/api/clip-reports/${encodeURIComponent(reportId)}`, {
    method: 'GET'
  }, '获取报告详情失败');
}

export async function getClipReportUnlockQuote(reportId, payload = {}) {
  if (!reportId) throw new Error('reportId required');
  return requestJson(`/api/clip-reports/${encodeURIComponent(reportId)}/unlock-quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '获取解锁报价失败');
}

export async function unlockClipReport(reportId, payload = {}) {
  if (!reportId) throw new Error('reportId required');
  return requestJson(`/api/clip-reports/${encodeURIComponent(reportId)}/unlock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '解锁报告失败');
}

export async function getUserPointsWallet() {
  return requestJson('/api/user/points/wallet', { method: 'GET' }, '获取积分钱包失败');
}

export async function getUserPointsTransactions(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  const url = `/api/user/points/transactions${query.toString() ? `?${query.toString()}` : ''}`;
  return requestJson(url, { method: 'GET' }, '获取积分流水失败');
}

export async function rechargePoints(payload = {}) {
  return requestJson('/api/user/points/recharge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '充值失败');
}

export async function getUserNotifications(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.append(key, String(value));
  });
  const url = `/api/user/notifications${query.toString() ? `?${query.toString()}` : ''}`;
  return requestJson(url, { method: 'GET' }, '获取站内信失败');
}

export async function getBillingConfig() {
  return requestJson('/api/admin/billing/config', { method: 'GET' }, '获取计费配置失败');
}

export async function updateBillingConfig(payload = {}) {
  return requestJson('/api/admin/billing/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '更新计费配置失败');
}

export async function getRechargePackages() {
  return requestJson('/api/admin/recharge-packages', { method: 'GET' }, '获取充值档位失败');
}

export async function saveRechargePackage(payload = {}) {
  return requestJson('/api/admin/recharge-packages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }, '保存充值档位失败');
}
