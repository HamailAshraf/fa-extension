(function () {
  let audio = null;
  let isPlaying = false;

  function getSoundUrl() {
    return chrome.runtime.getURL("fahhhhh.mp3");
  }

  function playFahhh() {
    if (isPlaying) return;

    if (!audio) {
      audio = new Audio(getSoundUrl());
      audio.volume = 1.0;
      audio.onended = () => {
        isPlaying = false;
      };
      audio.onerror = () => {
        isPlaying = false;
      };
    }

    isPlaying = true;
    audio.currentTime = 0;
    audio.play().catch(() => {
      isPlaying = false;
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "PLAY_FAHHH") {
      playFahhh();
    }
  });
})();
