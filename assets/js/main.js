

function findById(collection, id) {
    for (const item of collection) {
        if (item.id === id) { return item; }
    }
    return null;
}
function resetAll() {
    $('#create-answer, #selection-answers, #results, #best-lie, #lie-results').css('display', 'none');

    $("#menu").removeClass('mSlideDown');
    $("#menu").removeClass('mSlideUp');
    document.getElementById('toggleMenuButton').innerHTML = '<i class="fas fa-caret-down"></i>';
    $('#toggleMenuButton').css('top', '100%');
    menuActive = false;

    updateScoreboard();
    updateTriviaQuestion();

    socket.removeAllListeners("player continue 1");
    socket.removeAllListeners("player selected lie");
    socket.removeAllListeners("player next round");
    socket.removeAllListeners("submitted lie");
    socket.removeAllListeners("player selected answer");

}

function setupCreatingLie(cb) {
    resetCreateLieDisplay();
    $('#create_submit-lie-button').on('click', submitLie);
    setupRound();
    cb && cb();
}

function updateTriviaQuestion() {
    socket.emit('get room info', roomID, function (rm) {
        $('#trivia-question').html(rm.question);
    });
}

function setupRound() {
    updateScoreboard();
    gamestate = CREATING_LIE;
    updateTriviaQuestion();
}

function submitLie() {
    var lie = $('#create_lie').val();
    if (lie == "") return;
    $("#create_lie").attr("readonly", true);
    $('#create_submit-lie-button').off().fadeOut(400);
    $('#create_ready-text').fadeIn(400, function () {
        socket.on('submitted lie', function (numReady, numTotal) {
            console.log('socket: submitted lie', numReady, numTotal);
            $('#create_ready-text').text(numReady + " / " + numTotal + " Ready");
            if (numReady / numTotal >= 0.75) $('#create_ready-text').css('color', '#1fb50e');
            else if (numReady / numTotal > 0.5) $('#create_ready-text').css('color', '#f4cd07');
            else $('#create_ready-text').css('color', '#bc3838');

            if (numReady == numTotal) {
                socket.removeAllListeners("submitted lie");
                $('#create-answer').fadeOut(400, function () {
                    resetCreateLieDisplay();
                    displayAnswerSelection(function () {
                        $('#selection-answers').fadeIn(400);
                    });
                });
            }
        });
        console.log('nameID', nameID);
        socket.emit('submit lie', roomID, nameID, lie);
    });

}

function resetCreateLieDisplay() {
    socket.removeAllListeners("submitted lie");
    $('#create_lie').val("");
    $("#create_lie").attr("readonly", false);
    $('#create_ready-text').css('display', 'none');
    $('#create_submit-lie-button').css('display', 'block');
    $('#create_ready-text').css('color', '#bc3838');
    $('#create_ready-text').text("Ready");
}


function displayAnswerSelection(cb) {
    gamestate = CHOOSING_ANSWER;

    socket.emit('get room info', roomID, function (rm) {
        var pl = rm.players;
        document.getElementById("selection-list").innerHTML = "";

        for (var i = 0; i < pl.length; i++) {
            var n = parseInt(Math.random() * pl.length);
            var c = pl[i];
            pl[i] = pl[n];
            pl[n] = c;
        }

        var randN = parseInt(Math.random() * pl.length);
        for (var i = 0; i < pl.length; i++) {
            if (i == randN) {
                var d = document.createElement("DIV");
                d.classList.add("selection-choice");
                d.innerText = rm.answer;
                d.setAttribute("data-aid", 0);
                document.getElementById("selection-list").appendChild(d);
            }

            if (pl[i].id == nameID) {
                document.getElementById("selection_player-answer").innerText = pl[i].lie;
                continue;
            }
            var d1 = document.createElement("DIV");
            d1.classList.add("selection-choice");
            d1.innerText = pl[i].lie;
            d1.setAttribute("data-aid", pl[i].id);
            document.getElementById("selection-list").appendChild(d1);


        }

        setupSelectableAnswers();
        cb && cb();
    });
}

var selectedAID = -1;
//0 is the answer

function setupSelectableAnswers() {
    $("#chooseAnswerReady").removeClass('is-visible');
    selectedAID = -1;
    $("#selection-list").children(".selection-choice").on("click tap", function (e) {
        e.preventDefault();
        $(this).addClass("selectedAnswer");
        selectedAID = $(this).attr("data-aid");
        $("#selection-list").children(".selection-choice").off();

        socket.on('player selected answer', function (numReady, numTotal) {
            $("#chooseAnswerReady").text(numReady + " / " + numTotal + " Ready");
            $("#chooseAnswerReady").addClass('is-visible');
            if (numReady == numTotal) {
                socket.removeAllListeners("player selected answer");
                $('#selection-answers').fadeOut(400, function () {
                    updateScoreboard();
                    displayResults(function () {
                        $('#results').fadeIn(400);
                    });
                });
            }
        });

        socket.emit('player selected answer', roomID, nameID, selectedAID);
    });
}

function displayResults(cb) {
    gamestate = ANSWER_RESULTS;


    $("#continue1Button").text("Continue");
    $('#continue1Button').css("background-color", "#bdffbd");
    let isReady = false;

    socket.on('player continue 1', function (numReady, numTotal) {
        $("#continue1Button").text((isReady ? (numReady + " / " + numTotal + " Ready") : "Continue"));

        if (numReady >= numTotal / 2) {
            socket.removeAllListeners("player continue 1");
            $('#results').fadeOut(400);
            displayVotingForLie(function () {
                $('#best-lie').fadeIn(400);
            });
        }
    });

    $('#continue1Button').off().on('click tap', function (e) {
        isReady = true;
        e.preventDefault();
        $(this).off();
        socket.emit('player continue 1', roomID, nameID);
    });


    socket.emit('get room info', roomID, function (rm) {
        document.getElementById("results-list").innerHTML = "";
        var pl = rm.players;

        var playersChosenAnswers = pl.map(x => ({ id: x.id, players: [] }));
        playersChosenAnswers.push({ id: "0", players: [] });

        for (var i = 0; i < pl.length; i++) {
            const chosenAnswer = findById(playersChosenAnswers, pl[i].answerID);
            if (chosenAnswer) {
                chosenAnswer.players.push(pl[i]);
            } else {
                console.error('chosenAnswer is null', playersChosenAnswers, pl[i]);
            }
        }

        for (var i = 0; i < playersChosenAnswers.length; i++) {
            const answerData = playersChosenAnswers[i];
            const answerPlayer = answerData.id == 0 ? null : findById(pl, answerData.id);
            var d = document.createElement("DIV");
            d.classList.add("result-choice");
            if (answerData.id == 0) d.classList.add("result-answer");
            if (answerData.id == nameID) d.classList.add("result-pl");

            /* Start title */
            var title = document.createElement("P");
            title.classList.add("result-choice-title");

            var n = document.createElement("SPAN");
            n.classList.add("result-choice-name");
            n.innerText = ((answerData.id == 0) ? "ANSWER" : answerPlayer.name);
            if (answerData.id == nameID) n.innerText = answerPlayer.name + " (You)";

            var np = document.createElement("SPAN");
            np.classList.add("result-choice-point");
            np.innerText = ((answerData.id == 0) ? "" : "+" + answerData.players.length);

            title.appendChild(n);
            title.appendChild(np);
            d.appendChild(title);
            d.appendChild(document.createElement("HR"));
            /* End title */

            /* Start Answer */
            var ans = document.createElement("P");
            ans.classList.add("result-choice-text");
            ans.innerText = ((answerData.id == 0) ? rm.answer : answerPlayer.lie);
            d.appendChild(ans); d.appendChild(document.createElement("HR"));
            /* End Answer */

            /* Start Players */
            var sl = document.createElement("DIV");
            sl.classList.add("result-choice-players");
            for (var j = 0; j < answerData.players.length; j++) {
                var slT = document.createElement("P");
                slT.classList.add("result-choice-player-title");
                if (answerData.players[j].id == nameID)
                    slT.classList.add("result-pl");

                var sltN = document.createElement("SPAN");
                sltN.classList.add("result-choice-name");
                sltN.innerText = answerData.players[j].name;
                if (answerData.players[j].id == nameID)
                    sltN.innerText = answerData.players[j].name + " (You)";


                var sltP = document.createElement("SPAN");
                sltP.classList.add("result-choice-point");
                sltP.innerText = ((answerData.id == 0) ? "+2" : "");

                slT.appendChild(sltN); slT.appendChild(sltP);
                sl.appendChild(slT);
            }
            d.appendChild(sl);
            /* End Players */


            document.getElementById("results-list").appendChild(d);

        }

        cb && cb();
    });
}


function displayVotingForLie(cb) {
    gamestate = CHOOSING_BEST_LIE;
    socket.emit('get room info', roomID, function (rm) {
        var pl = rm.players;

        document.getElementById("lie-list").innerHTML = "";

        for (var i = 0; i < pl.length; i++) {
            var n = parseInt(Math.random() * pl.length);
            var c = pl[i];
            pl[i] = pl[n];
            pl[n] = c;
        }

        for (var i = 0; i < pl.length; i++) {

            if (pl[i].id == nameID) {
                document.getElementById("lie_player-answer").innerText = pl[i].lie;
                continue;
            }
            var d1 = document.createElement("DIV");
            d1.classList.add("lie-choice");
            d1.innerText = pl[i].lie;
            d1.setAttribute("data-lid", pl[i].id);
            document.getElementById("lie-list").appendChild(d1);
        }

        setupSelectableLies();
        cb && cb();
    });
}

var selectedLID = -1;

function setupSelectableLies() {
    selectedLID = -1;
    $("#chooseLieReady").removeClass('is-visible');

    $("#lie-list").children(".lie-choice").on("click tap", function (e) {
        e.preventDefault();
            $(this).addClass("selectedLie");
            selectedLID = $(this).attr("data-lid");
        isReady = true;
        $("#lie-list").children(".lie-choice").off();
        
        socket.on('player selected lie', function (numReady, numTotal) {
            $("#chooseLieReady").text(numReady + " / " + numTotal + " Ready");
            $("#chooseLieReady").addClass('is-visible');
    
            if (numReady == numTotal) {
                socket.removeAllListeners("player selected lie");
                $('#best-lie').fadeOut(400, function () {
                    updateScoreboard();
                    displayLieResults(function () {
                        $('#lie-results').fadeIn(400);
                    });
                });
            }
        });    

        socket.emit('player selected lie', roomID, nameID, selectedLID);
    });
}


function displayLieResults(cb) {
    gamestate = BEST_LIE_RESULTS;

    $("#nextRoundButton").text("Next Round");
    $('#nextRoundButton').css("background-color", "#bdffbd");
    let isReady = false;

    socket.on('player next round', function (numReady, numTotal) {
        $("#nextRoundButton").text(isReady ? numReady + " / " + numTotal + " Ready" : 'Next Round');

        if (numReady >= numTotal / 2) {
            socket.removeAllListeners("player next round");
            $('#playing').fadeOut(400, function () {
                $('#lie-results').css('display', 'none');
                $('#create-answer').css('display', 'block');
                setupCreatingLie();
                $('#playing').fadeIn(400);
            });
        }
    });

    $('#nextRoundButton').off().on('click tap', function (e) {
        e.preventDefault();
        isReady = true;
        $(this).off();
        $("#nextRoundButton").css("background-color", "#40d15d");
        socket.emit('player next round', roomID, nameID);
    });

    socket.emit('get room info', roomID, function (rm) {
        document.getElementById("lie-results-list").innerHTML = "";
        var pl = rm.players;

        var playersChosenLies = pl.map(x => ({ id: x.id, players: [] }));

        for (var i = 0; i < pl.length; i++) {
            const chosenLie = findById(playersChosenLies, pl[i].lieID);
            if (chosenLie) {
                chosenLie.players.push(pl[i]);
            } else {
                console.error('chosenLie is null', playersChosenLies, pl[i]);
            }
        }


        var playerScores = pl.map(x => ({ id: x.id, score: 0 }));
        for (var i = 0; i < pl.length; i++) {
            const playerScore = findById(playerScores, pl[i].lieID);
            if (playerScore) {
                playerScore.score++;
            } else {
                console.error('playerScore is null', playerScores, pl[i]);
            }
        }

        var max = -1;
        var pM = [];
        for (var i = 0; i < playerScores.length; i++) {
            if (playerScores[i].score > max) {
                max = playerScores[i].score;
                pM = [];
                pM.push(playerScores[i].id);
            } else if (playerScores[i].score == max) {
                pM.push(playerScores[i].id);
            }
        }


        var dList = [];

        for (var i = 0; i < pl.length; i++) {
            const player = pl[i];
            var d = document.createElement("DIV");
            d.classList.add("result-choice");
            if (player.id == nameID) d.classList.add("result-pl");

            /* Start title */
            var title = document.createElement("P");
            title.classList.add("result-choice-title");

            var n = document.createElement("SPAN");
            n.classList.add("result-choice-name");
            n.innerText = player.name;
            if (player.id == nameID) n.innerText = player.name + " (You)";

            var np = document.createElement("SPAN");
            np.classList.add("result-choice-point");
            np.innerText = pM.includes(player.id) ? "+2" : "";

            title.appendChild(n);
            title.appendChild(np);
            d.appendChild(title);
            d.appendChild(document.createElement("HR"));
            /* End title */

            /* Start Answer */
            var ans = document.createElement("P");
            ans.classList.add("result-choice-text");
            ans.innerText = player.lie;
            d.appendChild(ans);
            d.appendChild(document.createElement("HR"));
            /* End Answer */

            /* Start Players */
            var sl = document.createElement("DIV");
            sl.classList.add("result-choice-players");
            for (var j = 0; j < playersChosenLies[i].players.length; j++) {
                var slT = document.createElement("P");
                slT.classList.add("result-choice-player-title");
                if (playersChosenLies[i].players[j].id == nameID)
                    slT.classList.add("result-pl");

                var sltN = document.createElement("SPAN");
                sltN.classList.add("result-choice-name");
                sltN.innerText = playersChosenLies[i].players[j].name;
                if (playersChosenLies[i].players[j].id == nameID)
                    sltN.innerText = playersChosenLies[i].players[j].name + " (You)";


                var sltP = document.createElement("SPAN");
                sltP.classList.add("result-choice-point");
                sltP.innerText = "";

                slT.appendChild(sltN);
                slT.appendChild(sltP);
                sl.appendChild(slT);
            }
            d.appendChild(sl);
            /* End Players */

            if (pM.includes(player.id)) dList.unshift(d);
            else dList.push(d);

        }

        for (var dp of dList) {
            document.getElementById("lie-results-list").appendChild(dp);
        }


        cb && cb();
    });
}
