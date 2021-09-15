
var nameID;

const urlParams = new URLSearchParams(window.location.search);
var roomID = urlParams.get('room') || "";
var name = urlParams.get('name') || "";
 
document.getElementById("start-join-roomid").value = roomID;
document.getElementById("start-join-name").value = name;

$("#start-join-roomid").on({
    keydown: function (e) {
        if (e.which === 32)
            return false;
    },
    change: function () {
        this.value = this.value.replace(/\s/g, "");
    }
});

var WrulesActive = false;
$("#waiting-rules").on("click", function (e) {
    e.preventDefault();
    WrulesActive = true;
    if (WrulesActive) {
        document.getElementById("waiting-rule-display").style.display = "block";
    }
});
$("#waiting-close-rule-display").on("click", function (e) {
    e.preventDefault();
    WrulesActive = false;
    if (!WrulesActive) {
        document.getElementById("waiting-rule-display").style.display = "none";
    }
});

var rulesActive = false;
$("#rules").on("click", function (e) {
    e.preventDefault();
    rulesActive = true;
    if (rulesActive) {
        document.getElementById("rule-display").style.display = "block";
    }
});
$("#close-rule-display").on("click", function (e) {
    e.preventDefault();
    rulesActive = false;
    if (!rulesActive) {
        document.getElementById("rule-display").style.display = "none";
    }
});


var nameChangeActive = false;
$("#change-name-cancel-button").on("click", function (e) {
    e.preventDefault();
    nameChangeActive = false;
    document.getElementById("change-name").style.display = "none";
    document.getElementById("change-name-name").value = "";
});
$("#change-name-close").on('click', function (e) {
    e.preventDefault();
    nameChangeActive = false;
    document.getElementById("change-name").style.display = "none";
    document.getElementById("change-name-name").value = "";
});
$("#change-name-save-button").on('click', function (e) {
    e.preventDefault();
    var n = document.getElementById("change-name-name").value;
    document.getElementById("change-name-name").value = "";
    document.getElementById("change-name").style.display = "none";
    socket.emit('change player name', roomID, nameID, n);
});


var prevScoredisplayed = false;
$('#close-prevScore-display').on('click', function (e) {
    e.preventDefault();
    prevScoredisplayed = false;
    $('#prevScoreDisplay').css('display', 'none');
});

$('#prevScoreB').on('click', function (e) {
    e.preventDefault();
    prevScoredisplayed = true;
    $('#prevScoreDisplay').css('display', 'block');
});


document.getElementById("start-join-roomid").addEventListener('input', function (evt) {
    document.getElementById("start-join-error").innerText = "";

    if (this.value.length != 4) {
        this.style.border = "2px solid red";
    } else {
        this.style.border = "1px solid #e5cbb7";
    }
});

document.getElementById("start-join-name").addEventListener('input', function (evt) {
    if (this.value.length == 0) {
        this.style.border = "2px solid red";
    } else {
        this.style.border = "1px solid #e5cbb7";
    }
});

var prevScore = [];
var displayPrevScore = false;

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

nameID = uuidv4();


function joinGame() {
    $("#start-join-game-button").off('click');
    setTimeout(function () {
        $("#start-join-game-button").on('click', joinGame);
    }, 2000);

    var room = document.getElementById("start-join-roomid").value;
    var n = document.getElementById("start-join-name").value;
    if (room.length < 4) {
        document.getElementById("start-join-roomid").style.border = "2px solid red";
        return
    } else if (n.length == 0) {
        document.getElementById("start-join-name").style.border = "2px solid red";
        return;
    }

    playerName = n;
    socket.emit("join room", room, n, nameID, function (res, nameId) {
        if (res == "null") {
            //room does not exist
            document.getElementById("start-join-error").innerText = "Room does not exist";
            document.getElementById("start-join-roomid").style.border = "2px solid red";
        } else if (res == "started") {
            //game in session
            document.getElementById("start-join-error").innerText = "Game in session";
            document.getElementById("start-join-roomid").style.border = "2px solid red";
        } else if (res == "full") {
            //game full
            document.getElementById("start-join-error").innerText = "Room full";
            document.getElementById("start-join-roomid").style.border = "2px solid red";
        } else if (res == "success") {
            //joined successfully
            document.getElementById("start-join-roomid").value = "";
            document.getElementById("start-join-name").value = "";
            document.getElementById("start-join-display").style.display = "none";
            document.getElementById("start").style.display = "none";
            nameID = nameId;
            roomID = room;
            displayWaitingRoom();
        }
    });

}

$("#start-join-game-button").click(joinGame);
   

function displayWaitingRoom() {
    gamestate = NOT_PLAYING;
    document.getElementById("playing").style.display = "none";

    $("#startButton").unbind().click(startGame);
    $("#leaveButton").unbind().click(leave);


    document.getElementById("wait-roomCode").innerText = roomID;
    document.getElementById("waiting-player-list").innerHTML = "";


    $('#waiting-room').fadeIn(400);

    if (displayPrevScore) {
        socket.emit('get players', roomID, function (pl) {
            $('#prevScoreB').css('display', 'block');
            var s = "";
            for (var p of pl) {
                s += "<div class=\"row\">" +
                    "<div class=\"col-6\"><h5>" + p.name + ((p.id == nameID) ? " (You)" : "") +
                    "</h5></div>" +
                    "<div class=\"col-6\" id='sb-" + p.id + "'><h5>" + p.points + "</h5></div>" +
                    "</div>";
            }
            document.getElementById("prevScoreDisplayP").innerHTML = s;
        });
    } else $('prevScoreB').css('display', 'none');




    socket.emit("get players", roomID, function (p) {
        displayPlayersInWaiting(p);
    });

    socket.on('update players', function (players) {
        displayPlayersInWaiting(players);
    });




    socket.on('game start', function () {
        $('#waiting-room').fadeOut(800, function () {

            WrulesActive = false;
            document.getElementById("waiting-rule-display").style.display = "none";
            document.getElementById("waiting-room").style.display = "none";
            socket.removeAllListeners("start game");
            socket.removeAllListeners("update players");

            resetAll();
            $('#create-answer').css('display', 'block');
            setupCreatingLie();
            $('#playing').fadeIn(400);

        });


    });

}



function displayPlayersInWaiting(p) {
    $("#startButton").attr('disabled', p.length < 3);
    var s = "";
    for (let pl of p) {
        if (nameID == pl.id) {
            s += "<li class=\"col-12 waiting-player\">" +
                pl.name + " (You)" +
                "<span class=\"editName\">" +
                "<i class=\"fas fa-pencil-alt\" data-id='" + pl.id + "'></i></span></li>";
        } else {
            s += "<li class=\"col-12 waiting-player\">" +
                pl.name +
                "<span class=\"editName\">" +
                "<i class=\"fas fa-times deleteP\" data-id='" + pl.id + "'></i></span></li>";
        }
    }
    document.getElementById("waiting-player-list").innerHTML = s;

    $(".deleteP").on("click", function (e) {
        e.preventDefault();
        socket.emit('delete player', roomID, $(this).attr("data-id"), function (res) {
            if ($(this).attr("data-id") == nameID) {
                isLeaving = true;
                location.reload();
            }
        });
    });

    $(".fa-pencil-alt").on('click', function (e) {
        e.preventDefault();
        nameChangeActive = true;
        document.getElementById("change-name").style.display = "block";
    });
}



function startGame(e) {
    e.preventDefault();

    $("#startButton").off("click");

    setTimeout(function () {
        $("#startButton").on("click", startGame);
    }, 2000);

    socket.emit('start game', roomID);
    prevScore = [];
}


function backToWaitingRoom(cb) {
    menuActive = false;
    if ($('#menu').hasClass('mSlideDown')) {
        $("#menu").removeClass('mSlideDown');
        $("#menu").addClass('mSlideUp');
    }
    document.getElementById('toggleMenuButton').innerHTML = '<i class="fas fa-caret-down"></i>';
    $('#toggleMenuButton').css('top', '100%');

    $('#playing').fadeOut(1000, function () {
        $("#menu").removeClass('mSlideUp');
        cb && cb();
    });
}



function displayDBRooms(pass) {
    socket.emit('display rooms', pass, function (r) {
        console.log(r);
    });
}

function displayDBPlayers(pass, r) {
    socket.emit('display players', pass, r, function (p) {
        console.log(p);
    });
}
