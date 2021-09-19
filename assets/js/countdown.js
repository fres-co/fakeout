let progressBarInterval = null;

function clearCountDown() {
    clearInterval(progressBarInterval);
    document.getElementById('progress').style.width = '100%';
}

function countDown(callBack) {
    let countdown = 30;
    clearInterval(progressBarInterval);
    progressBarInterval = setInterval(() => {
        countdown--;

        if (countdown !== 0) {
            document.getElementById('progress').style.width = (countdown * 100 / 30) + '%';
        } else {
            playSound('wrongSound', 0.5);
            clearInterval(progressBarInterval);
            callBack();
        }
    }, 1000); 
}
