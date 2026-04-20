(() => {
  const LOBBY_BGM_VOLUME_KEY = 'sf_slg_lobby_bgm_volume';
  const LOBBY_BGM_ENABLED_KEY = 'sf_slg_lobby_bgm_enabled';
  const TRACKS = [
    { key: 'lobby-1', title: 'Lobby Track 1', src: '/audio/lobby/lobby-1.mp3' },
    { key: 'lobby-2', title: 'Lobby Track 2', src: '/audio/lobby/lobby-2.mp3' }
  ];

  const state = {
    installed: false,
    audio: null,
    currentIndex: 0,
    userInteracted: false,
    enabled: localStorage.getItem(LOBBY_BGM_ENABLED_KEY) !== '0',
    volume: Math.max(0, Math.min(1, Number(localStorage.getItem(LOBBY_BGM_VOLUME_KEY) || 0.35))),
    pendingPlay: false
  };

  function ensureAudio() {
    if (state.audio) return state.audio;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = state.volume;
    audio.addEventListener('ended', () => {
      state.currentIndex = (state.currentIndex + 1) % TRACKS.length;
      loadCurrentTrack();
      if (shouldPlayInLobby()) play();
      renderWidget();
    });
    audio.addEventListener('error', () => {
      renderWidget('BGM 파일을 찾지 못했습니다. public/audio/lobby 폴더를 확인하세요.');
    });
    state.audio = audio;
    return audio;
  }

  function currentTrack() {
    return TRACKS[state.currentIndex] || TRACKS[0];
  }

  function loadCurrentTrack() {
    const audio = ensureAudio();
    const track = currentTrack();
    if (audio.dataset.trackKey === track.key) return;
    audio.dataset.trackKey = track.key;
    audio.src = track.src;
    audio.load();
  }

  function shouldPlayInLobby() {
    const lobbyVisible = !document.getElementById('lobbyPanel')?.classList.contains('hidden');
    const gameVisible = !document.getElementById('gamePanel')?.classList.contains('hidden');
    const authVisible = !document.getElementById('authPanel')?.classList.contains('hidden');
    return lobbyVisible && !gameVisible && !authVisible && state.enabled;
  }

  async function play() {
    const audio = ensureAudio();
    loadCurrentTrack();
    audio.volume = state.volume;
    if (!state.userInteracted) {
      state.pendingPlay = true;
      return;
    }
    try {
      await audio.play();
      state.pendingPlay = false;
    } catch (err) {
      state.pendingPlay = true;
    }
    renderWidget();
  }

  function pause() {
    const audio = ensureAudio();
    audio.pause();
    renderWidget();
  }

  function syncPlayback() {
    if (shouldPlayInLobby()) play();
    else pause();
  }

  function setEnabled(enabled) {
    state.enabled = Boolean(enabled);
    localStorage.setItem(LOBBY_BGM_ENABLED_KEY, state.enabled ? '1' : '0');
    syncPlayback();
    renderWidget();
  }

  function setVolume(value) {
    state.volume = Math.max(0, Math.min(1, Number(value || 0)));
    localStorage.setItem(LOBBY_BGM_VOLUME_KEY, String(state.volume));
    ensureAudio().volume = state.volume;
    renderWidget();
  }

  function nextTrack() {
    state.currentIndex = (state.currentIndex + 1) % TRACKS.length;
    const wasPlaying = !ensureAudio().paused;
    loadCurrentTrack();
    if (wasPlaying || shouldPlayInLobby()) play();
    renderWidget();
  }

  function ensureWidget() {
    let widget = document.getElementById('lobbyBgmWidget');
    if (widget) return widget;
    widget = document.createElement('section');
    widget.id = 'lobbyBgmWidget';
    widget.className = 'lobby-bgm-widget';
    const header = document.querySelector('#lobbyPanel .lobby-header');
    if (header) header.insertAdjacentElement('afterend', widget);
    else document.getElementById('lobbyPanel')?.prepend(widget);
    widget.addEventListener('input', (event) => {
      const target = event.target;
      if (target.matches('[data-bgm-volume]')) setVolume(target.value);
    });
    widget.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.bgmToggle) setEnabled(!state.enabled);
      if (button.dataset.bgmNext) nextTrack();
    });
    return widget;
  }

  function renderWidget(message = '') {
    const widget = ensureWidget();
    const track = currentTrack();
    const audio = ensureAudio();
    const isPlaying = !audio.paused && !audio.ended && audio.currentTime > 0;
    widget.innerHTML = `
      <div class="lobby-bgm-head">
        <div>
          <strong>로비 BGM</strong>
          <span>${track.title}</span>
        </div>
        <div class="button-row">
          <button type="button" data-bgmToggle="1">${state.enabled ? '끔' : '켬'}</button>
          <button type="button" data-bgmNext="1">다음 곡</button>
        </div>
      </div>
      <div class="lobby-bgm-controls">
        <label for="lobbyBgmVolumeRange">음량 ${Math.round(state.volume * 100)}%</label>
        <input id="lobbyBgmVolumeRange" data-bgm-volume="1" type="range" min="0" max="1" step="0.01" value="${state.volume}">
      </div>
      <div class="hint">${message || (state.enabled ? (isPlaying ? '로비에서만 재생 중' : '로비 진입 시 자동 재생') : 'BGM 비활성화')}</div>
    `;
    widget.classList.toggle('hidden', document.getElementById('lobbyPanel')?.classList.contains('hidden'));
  }

  function registerInteractionUnlock() {
    const unlock = () => {
      state.userInteracted = true;
      if (state.pendingPlay && shouldPlayInLobby()) play();
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  function wrap(name, after) {
    const original = window[name];
    if (typeof original !== 'function' || original.__lobbyBgmWrapped) return;
    const wrapped = function (...args) {
      const result = original.apply(this, args);
      Promise.resolve(result).finally(after);
      return result;
    };
    wrapped.__lobbyBgmWrapped = true;
    window[name] = wrapped;
  }

  function install() {
    if (state.installed) return;
    state.installed = true;
    ensureAudio();
    ensureWidget();
    registerInteractionUnlock();
    wrap('showLobby', () => { renderWidget(); syncPlayback(); });
    wrap('showGame', () => { renderWidget(); syncPlayback(); });
    wrap('showAuth', () => { renderWidget(); syncPlayback(); });
    wrap('enterCurrentSession', () => { renderWidget(); syncPlayback(); });
    document.addEventListener('visibilitychange', syncPlayback);
    renderWidget();
    syncPlayback();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
