var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var questionManager = require('./js/questions.js');

app.use('/assets', express.static('assets'));


app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});


class Room {
    constructor(roomid) {
        this.roomid = roomid;
        this.startingGame = false;
        this.endingGame = false;
        this.gamestart = false;
        this.gamestate = -1;
        this.players = [];

        this.question = "";
        this.answer = "";
    }
    addPlayer(p) { this.players.push(p); }
    getPlayerById(id) {
        for (var p of this.players) {
            if (p.id == id) return p;
        }
        return null;
    }
}

class Player {
    constructor(name, id, roomid) {
        this.roomid = roomid;
        this.id = id;
        this.name = name;
        this.isready = false;
        this.nextRound = false;
        this.continue1 = false;
        this.points = 0;
        this.lie = "";
        this.submittedlie = false;
        this.answerID = -1;
        this.lieID = -1;
        this.selectedAnswer = false;
        this.selectedBestLie = false;

    }
}

const CREATING_LIE = 0;
const CHOOSING_ANSWER = 1;
const ANSWER_RESULTS = 2;
// const CHOOSING_BEST_LIE = 3;
// const BEST_LIE_RESULTS = 4;


var rooms = {};


io.on('connection', function (socket) {
    console.log("connected");
    let currentPlayerId = null;
    let currentRoomId = null;
    // socket.emit('get room id', function (id) {
    //     if (id != "") {
    //         if (rooms[id] != null) {
    //             socket.join(id);
    //             socket.emit('display current view', rooms[id].gamestart, rooms[id].gamestate);
    //             console.log(rooms[id]);
    //         }
    //     }
    // });


    function setupRoom(roomid) {
        var qq = questionManager.getRandomQuestion();
        rooms[roomid].question = qq.question;
        rooms[roomid].answer = qq.answer[parseInt(qq.answer.length * Math.random())];
        rooms[roomid].lies = qq.lies;
        rooms[roomid].gamestate = CREATING_LIE;
    }

    function findById(collection, playerId) {
        for (const p of collection) {
            if (p.id === playerId) {
                return p;
            }
        }
        return null;
    }

    socket.on('submit lie', function (roomid, nameid, lie) {
        if (!rooms[roomid]) { return; }

        console.log('submit lie', rooms[roomid].players, nameid);
        const player = findById(rooms[roomid].players, nameid);
        console.log('submit lie', player);
        if (!player) { return; }

        player.lie = lie;
        player.submittedlie = true;

        var c = 0;
        for (var p of rooms[roomid].players) {
            if (p.submittedlie) { c++; }
        }
        io.to(roomid).emit("submitted lie", c, rooms[roomid].players.length);

        if (c == rooms[roomid].players.length) {
            rooms[roomid].gamestate = CHOOSING_ANSWER;
        }
    });

    // socket.on('player continue 1', function (roomid, id) {
    //     if (rooms[roomid] == null) return;

    //     const player = findById(rooms[roomid].players, id);
    //     if (!player) { return; }

    //     player.continue1 = true;
    //     var c = 0;
    //     for (var p of rooms[roomid].players) {
    //         if (p.continue1) { c++; }
    //     }
    //     io.to(roomid).emit("player continue 1", c, rooms[roomid].players.length);
    //     if (c >= rooms[roomid].players.length / 2) { 
    //         rooms[roomid].gamestate = CHOOSING_BEST_LIE; 
    //     }
    // });

    function resetRound(roomid) {
        for (var i = 0; i < rooms[roomid].players.length; i++) {
            rooms[roomid].players[i].isready = false;
            rooms[roomid].players[i].nextRound = false;
            rooms[roomid].players[i].continue1 = false;
            rooms[roomid].players[i].submittedlie = false;
            rooms[roomid].players[i].selectedAnswer = false;
            rooms[roomid].players[i].selectedBestLie = false;
            rooms[roomid].players[i].lie = "";
            rooms[roomid].players[i].answerID = -1;
            rooms[roomid].players[i].lieID = -1;
        }
        setupRoom(roomid);
    }

    socket.on('player next round', function (roomid, id) {
        if (rooms[roomid] == null) return;
        
        const player = findById(rooms[roomid].players, id);
        if (!player) { return; }

        player.nextRound = true;
        
        var c = 0;
        for (var p of rooms[roomid].players) {
            if (p.nextRound) c++;
        }
        io.to(roomid).emit("player next round", c, rooms[roomid].players.length);

        if (c >= rooms[roomid].players.length / 2) { 
            resetRound(roomid);
        }
    });

    socket.on('player selected answer', function (roomid, nameid, aid) {
        if (rooms[roomid] == null) return;
        
        const player = findById(rooms[roomid].players, nameid);
        if (!player) { return; }

        player.answerID = aid;
        player.selectedAnswer = true;
        var c = 0;
        for (var p of rooms[roomid].players) {
            if (p.selectedAnswer) c++;
        }
        io.to(roomid).emit("player selected answer", c, rooms[roomid].players.length);

        if (c == rooms[roomid].players.length) {
            calculateResults(roomid);
            rooms[roomid].gamestate = ANSWER_RESULTS;
        }
    });

    // socket.on('player selected lie', function (roomid, nameid, lid) {
    //     if (rooms[roomid] == null) return;

    //     const player = findById(rooms[roomid].players, nameid);
    //     if (!player) { return; }

    //     player.lieID = lid;
    //     player.selectedBestLie = true;

    //     var c = 0;
    //     for (var p of rooms[roomid].players) {
    //         if (p.selectedBestLie) { c++; }
    //     }
    //     io.to(roomid).emit("player selected lie", c, rooms[roomid].players.length);

    //     if (c == rooms[roomid].players.length) {
    //         calculateBestLie(roomid);
    //         rooms[roomid].gamestate = BEST_LIE_RESULTS;
    //     }
    // });

    // function calculateBestLie(roomid) {
        
    //     var playerScores = rooms[roomid].players.map(x => ({ id: x.id, score: 0 }));
        
    //     for (var i = 0; i < rooms[roomid].players.length; i++) {
    //         var player = rooms[roomid].players[i];
    //         const playerScore = findById(playerScores, player.lieID);
    //         playerScore.score++; 
    //     }

    //     var max = -1;
    //     var pM = [];
    //     for (var i = 0; i < playerScores.length; i++) {
    //         if (playerScores[i].score > max) {
    //             max = playerScores[i].score;
    //             pM = [];
    //             pM.push(playerScores[i].id);
    //         } else if (playerScores[i] == max) {
    //             pM.push(playerScores[i].id);
    //         }
    //     }


    //     for (var i = 0; i < pM.length; i++) {
    //         const player = findById(rooms[roomid].players, pM[i]);
    //         if (!player) { continue; }
    //         player.points += 2;
    //     }
    // }

    function calculateResults(roomid) {
        for (var i = 0; i < rooms[roomid].players.length; i++) {
            var p = rooms[roomid].players[i];
            if (p.answerID == 0) {
                p.points += 2;
            }
            else {
                const player = findById(rooms[roomid].players, p.answerID);
                if (!player) { continue; }
                player.points++;
            }
        }
    }

    socket.on('end game', function (roomid) {
        if (rooms[roomid] == null) return;
        if (rooms[roomid].endingGame) return;
        rooms[roomid].endGame = true;
        rooms[roomid].gamestart = false;
        rooms[roomid].startingGame = false;
        io.to(roomid).emit('game ended');
    });

    socket.on('start game', function (roomid) {
        if (rooms[roomid] == null) return;
        if (rooms[roomid].players.length < 3) return;
        if (rooms[roomid].startingGame) return;
        rooms[roomid].startingGame = true;
        rooms[roomid].endingGame = false;
        rooms[roomid].gamestart = true;

        for (var i = 0; i < rooms[roomid].players.length; i++) {
            rooms[roomid].players[i].points = 0;
        }

        resetRound(roomid);

        io.to(roomid).emit('game start');
    });

    socket.on('get players', function (roomid, cb) {
        if (rooms[roomid] == null) return;
        cb && cb(rooms[roomid].players);
        return;
    });

    socket.on('get room info', function (roomid, cb) {
        if (rooms[roomid] == null) return;
        cb && cb(rooms[roomid]);
        return;
    });

    socket.on('join room', function (roomid, name, playerId, callback) {
        
        currentRoomId = roomid;
        currentPlayerId = playerId;
        
        if (rooms[roomid] == null) {
            // New room
            var ro = new Room(roomid);
            ro.addPlayer(new Player(name, playerId, roomid));
            rooms[roomid] = ro;
            socket.join(roomid);
            callback && callback("success", currentPlayerId);
            return;
        }

        if (rooms[roomid].gamestart) {
            // Already started
            callback && callback("started", 0);
            return;
        }
        if (rooms[roomid].players.length > 30) {
            // Too many players
            callback && callback("full", 0);
            return;
        }

        // var numPlayers = rooms[roomid].players.length + 1;
        socket.join(roomid);
        rooms[roomid].addPlayer(new Player(name, currentPlayerId, roomid));

        callback && callback("success", currentPlayerId);
        io.to(roomid).emit("update players", rooms[roomid].players);
    });

    function deletePlayer(roomid, id, callback) {
        if (rooms[roomid] == null) return;
        rooms[roomid].players = rooms[roomid].players.filter(x => x.id !== id);
        
        if (rooms[roomid].players.length == 1) {
            delete rooms[roomid];
            callback && callback();
            return;
        }
        
        io.to(roomid).emit('player leave', rooms[roomid].gamestart, id);
        callback && callback();
    }

    socket.on('delete player', function (roomid, id, callback) {
        deletePlayer(roomid, id, callback);
    });

    socket.on('change player name', function (roomid, id, n) {
        if (rooms[roomid] == null) return;
        const player = findById(rooms[roomid].players, id);
        player.name = n;
        io.to(roomid).emit("update players", rooms[roomid].players);
    });

    socket.on('disconnect', () => {
        console.log('disconnect', currentRoomId, currentPlayerId);
        if (currentRoomId) {
            deletePlayer(currentRoomId, currentPlayerId, null);
            console.log(rooms[currentRoomId] && rooms[currentRoomId].players);
        }
    });
});

const PORT = process.env.PORT || 8000;
http.listen(PORT, function () {
    console.log('listening on *:' + PORT);
});
