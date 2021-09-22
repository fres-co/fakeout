let progressBarInterval = null;

function clearCountDown() {
    clearInterval(progressBarInterval);
    document.getElementById('progress').style.width = '100%';
}

function countDown(duration, shouldPlaySound, callBack) {
    let countdown = duration;
    clearInterval(progressBarInterval);
    progressBarInterval = setInterval(() => {
        countdown--;

        if (countdown !== 0) {
            document.getElementById('progress').style.width = (countdown * 100 / duration) + '%';
        } else {
            if (shouldPlaySound) {
                playSound('wrongSound', 0.5);
            }
            clearInterval(progressBarInterval);
            callBack();
        }
    }, 1000); 
}
