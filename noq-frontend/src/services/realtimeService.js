const EVENT_NAME = 'noq:realtime:update';

const canUseWindow = () => typeof window !== 'undefined';

export const emitRealtimeEvent = (channel, payload = {}) => {
  if (!canUseWindow()) return;
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, {
      detail: {
        channel,
        payload,
        at: Date.now(),
      },
    })
  );
};

export const subscribeRealtimeEvent = (channel, handler) => {
  if (!canUseWindow() || typeof handler !== 'function') return () => {};

  const onRealtime = (event) => {
    const detail = event?.detail || {};
    if (detail.channel !== channel) return;
    handler(detail.payload || {});
  };

  const onStorage = (event) => {
    if (!event?.key || event.key !== `realtime:${channel}`) return;
    try {
      handler(JSON.parse(event.newValue || '{}'));
    } catch {
      handler({});
    }
  };

  window.addEventListener(EVENT_NAME, onRealtime);
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, onRealtime);
    window.removeEventListener('storage', onStorage);
  };
};

export const emitStorageSyncEvent = (channel, payload = {}) => {
  if (!canUseWindow()) return;
  const key = `realtime:${channel}`;
  try {
    localStorage.setItem(key, JSON.stringify({ ...payload, at: Date.now() }));
  } catch (_) {}
  emitRealtimeEvent(channel, payload);
};
