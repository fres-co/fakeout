

function findById(collection, id) {
    for (const item of collection) {
        if (item.id === id) { return item; }
    }
    return null;
}

function addTag(parentEl, tagName, className, innerText) {
    var n = document.createElement(tagName);
    n.classList.add(className);
    n.innerText = innerText;
    parentEl.appendChild(n);
    return n;
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

var lies = [];
function generateRandomLie() {
    $('#create_lie').val(lies[Math.floor(Math.random() * lies.length)]);
}


function setupCreatingLie(cb) {
    resetCreateLieDisplay();
    $('#create_random_lie').on('click', generateRandomLie);
    $('#create_submit-lie-button').on('click', submitLie);
    setupRound();
    cb && cb();
    countDown(function() {
        generateRandomLie();
        submitLie();
    });
}
 

function updateTriviaQuestion() {
    socket.emit('get room info', roomID, function (rm) {
        $('#trivia-question').html(rm.question);
        lies = rm.lies;
    });
}

function setupRound() {
    updateScoreboard();
    gamestate = CREATING_LIE;
    updateTriviaQuestion();
}

function submitLie() {
    playSound("playerAnsweredSound", 0.2);
    var lie = $('#create_lie').val();
    if (lie == "") return;
    $("#create_lie").attr("readonly", true);
    $("#create_random_lie").attr('disabled', true);
    $('#create_random_lie').off();
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
        socket.emit('submit lie', roomID, nameID, lie);
    });

}

function resetCreateLieDisplay() {
    clearCountDown();
    socket.removeAllListeners("submitted lie");
    $('#create_lie').val("");
    $("#create_lie").attr("readonly", false);
    $("#create_random_lie").removeAttr('disabled');
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
                var d = document.createElement("button");
                d.classList.add("selection-choice");
                d.classList.add("btn-block");
                d.innerText = rm.answer;
                d.setAttribute("data-aid", 0);
                document.getElementById("selection-list").appendChild(d);
            }

            if (pl[i].id == nameID) {
                document.getElementById("selection_player-answer").innerText = pl[i].lie;
                continue;
            }
            var d1 = document.createElement("button");
            d1.classList.add("selection-choice");
            d1.classList.add("btn-block");
            d1.innerText = pl[i].lie;
            d1.setAttribute("data-aid", pl[i].id);
            document.getElementById("selection-list").appendChild(d1);
        }

        setupSelectableAnswers();
        cb && cb();
        countDown(function() {
            onPlayerSelectAnswer(-1);
        });
    });
}

var selectedAID = -1;
// 0 is the answer

function onPlayerSelectAnswer(selectedAnswerId) {
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

    socket.emit('player selected answer', roomID, nameID, selectedAnswerId);
}

function setupSelectableAnswers() {
    $("#chooseAnswerReady").removeClass('is-visible');
    selectedAID = -1;
    $("#selection-list").children(".selection-choice").on("click tap", function (e) {
        e.preventDefault();
        clearCountDown();
        playSound("playerAnsweredSound", 0.2);
        $(this).addClass("selectedAnswer");
        selectedAID = $(this).attr("data-aid");
        onPlayerSelectAnswer(selectedAID);
    });
}

function displayResults(cb) {

    gamestate = ANSWER_RESULTS;
    playSound("gongSound", 0.2);

    $("#nextRoundButton")
        .text("Next round")
        .removeAttr("disabled");
        
    let isReady = false;

    countDown(function() {
        isReady = true;
        socket.emit('player next round', roomID, nameID);
    });

    socket.on('player next round', function (numReady, numTotal) {
        $("#nextRoundButton")
            .text((isReady ? (numReady + " / " + numTotal + " Ready") : "Next round"));

        if (numReady >= numTotal / 2) {
            socket.removeAllListeners("player next round");
            $('#results').fadeOut(400);

            $('#create-answer').css('display', 'block');
            setupCreatingLie();
            $('#playing').fadeIn(400);
            
            // displayVotingForLie(function () {
            //     $('#best-lie').fadeIn(400);
                
            // });
        }
    });

    $('#nextRoundButton').off().on('click tap', function (e) {
        clearCountDown();
        playSound("playerAnsweredSound", 0.2);
        $(this).attr("disabled", "disabled");
        isReady = true;
        e.preventDefault();
        $(this).off();
        socket.emit('player next round', roomID, nameID);
    });

    
    socket.emit('get room info', roomID, function (rm) {
        document.getElementById("results-list").innerHTML = "";
        var pl = rm.players;

        var playersChosenAnswers = pl.map(x => ({ id: x.id, players: [] }));
        playersChosenAnswers.unshift({ id: "0", players: [] });

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

            addTag(title, 'span', 'result-choice-text', answerData.id == 0 ? rm.answer : answerPlayer.lie);
            const name = answerData.id == 0 ? "" : answerData.id == nameID ? answerPlayer.name + " (You)" : answerPlayer.name;
            addTag(title, "span", "result-choice-point", (answerData.id == 0) ? "+2" : name + " +" + answerData.players.length);
            d.appendChild(title);
            
            /* Start Players */
            if (answerData.players.length) {
                d.appendChild(document.createElement("HR"));
                var sl = document.createElement("DIV");
                sl.classList.add("result-choice-players");
                for (var j = 0; j < answerData.players.length; j++) {
                    const el = addTag(sl, 'div', 'result-choice-player-title', answerData.players[j].id == nameID ? answerData.players[j].name + " (You)" : answerData.players[j].name);
                    if (answerData.players[j].id == nameID) {
                        el.classList.add('result-pl');
                    }
                }
                d.appendChild(sl);
            }
            /* End Players */


            document.getElementById("results-list").appendChild(d);

        }

        cb && cb();
    });
}

