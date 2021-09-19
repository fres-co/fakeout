function playSound(soundId, volume) {
    document.getElementById(soundId).volume = volume;
    document.getElementById(soundId).play();
}

