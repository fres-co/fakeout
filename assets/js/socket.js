

const NOT_PLAYING = -1;
const CREATING_LIE = 0;
const CHOOSING_ANSWER = 1;
const ANSWER_RESULTS = 2;

var gamestate = NOT_PLAYING;

var isLeaving = false;

window.onbeforeunload = function () {
    if (gamestate != NOT_PLAYING) return "Confirm?";
    // socket.onclose = function () {}; // disable onclose handler first
    // socket.close();
}

window.onpagehide = function () {
    if (!isLeaving) socket.emit('delete player', roomID, nameID);
};


// socket.on('get room id', function(cb){
//     cb&&cb(roomID);
// });


function leave(e) {
    e.preventDefault();
    socket.emit('delete player', roomID, nameID, function () {
        isLeaving = true;
        location.reload();
    });
}

function endGame(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to end the game for everyone?')) {
        socket.emit('end game', roomID);
    }
}


$("#leave-game-button").unbind().on("click tap", leave);
$("#end-game-button").unbind().on("click tap", endGame);

socket.on('game ended', function () {
    backToWaitingRoom(function () {
        displayPrevScore = true;
        displayWaitingRoom();
    });
});

socket.on('display current view', function (gamestart, gs) {
    if (!gamestart) {
        //go to main menu
        backToWaitingRoom(function () {
            displayPrevScore = true;
            displayWaitingRoom();
        });
    } else {

        $('#playing').fadeOut(400, function () {
            $('#create-answer, #selection-answers, #results, #best-lie, #lie-results').css('display', 'none');

            updateScoreboard();
            updateTriviaQuestion();

            socket.removeAllListeners("player continue 1");
            socket.removeAllListeners("player selected lie");
            socket.removeAllListeners("player next round");
            socket.removeAllListeners("submitted lie");
            socket.removeAllListeners("player selected answer");

            if (gs == CREATING_LIE && gamestate != gs) {
                resetCreateLieDisplay();
                setupCreatingLie();
                $('#create-answer').css('display', 'block');
                $('#playing').fadeIn(400);
            } else if (gs == CHOOSING_ANSWER) {
                resetCreateLieDisplay();
                displayAnswerSelection(function () {
                    $('#selection-answers').css('display', 'block');
                    $('#playing').fadeIn(400);
                });
            } else if (gs == ANSWER_RESULTS) {
                displayResults(function () {
                    $('#results').css('display', 'block');
                    $('#playing').fadeIn(400);
                });
            } else if (gs == CHOOSING_BEST_LIE) {
                displayVotingForLie(function () {
                    $('#best-lie').css('display', 'block');
                    $('#playing').fadeIn(400);
                });
            }
            gamestate = gs;
        });


    }
});


var resetting = false;
socket.on('player leave', function (shouldRestart, gamestart, id) {
    if (gamestart && !resetting) {
        //playing
        // if (nameID > id) nameID--;
        if (!shouldRestart) { return; }
        resetting = true;


        backToWaitingRoom(function () {
            $('#playerLeaveNotification').fadeIn(1500, function () {
                socket.emit('end game', roomID);
            }).fadeOut(400, function () {
                resetting = false;
                displayPrevScore = true;
                displayWaitingRoom();
            });
        });



    } else {
        // waiting
        if (id == nameID) {
            isLeaving = true;
            location.reload();
        } else {
            // if (nameID > id) nameID--;
            socket.emit("get players", roomID, function (p) {
                displayPlayersInWaiting(p);
            });

        }
    }
});
