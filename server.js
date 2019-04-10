
const path = require('path');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const dbUtil = require('./dbUtils');

const port = process.env.PORT || 5000;
app.use(express.static(path.join(__dirname, '/public')));

var rooms = [];
var codes = [];
var currentRoom = -1;

let mongoose = require('mongoose');

// set up default conn with the password
let db = 'mongodb+srv://A:ABCd1234!@quicksplash-db-dmuwu.mongodb.net/test?retryWrites=true';
mongoose.connect(db, {useNewUrlParser: true});
let qpDB = mongoose.connection;

// creating a Account Schema and Model
let Schema = mongoose.Schema;
let AccountSchema = new Schema(
    {
        fname: {type: String},
        lname: {type: String},
        email: {type: String},
        username: {type: String},
        password: {type: String}
    }
);

let Account = mongoose.model("Account", AccountSchema);

io.on('connection', function(socket){

    console.log("user connected");

    socket.on("login", function (loginInfo) {

        logObj = JSON.parse(loginInfo);
        let username = logObj.username;
        let password = logObj.password;

        // console.log(logObj);

        // query db for Account
        let auth = false;

        // find all athletes who play tennis, selecting the 'name' and 'age' fields
        Account.findOne({'username': username}, 'password', function (err,account) {
            if (err) {
                console.log("<<<<Hakuna Matata>>>>");
                // emit Login Failed
                return handleError(err);
            }

            console.log(account);


            if (account !== null && password === account.password)
                socket.emit('login-success');
            else
                socket.emit('login-fail');

        });

    });

    socket.on("signUp", function (signUpInfo) {
        console.log(signUpInfo);

        logObj = JSON.parse(signUpInfo);
        let fname = logObj.fname;
        let lname = logObj.lname;
        let email = logObj.email;
        let username = logObj.username;
        let password = logObj.password;

        // do input sanitization

        // create and add new account to db
        let newAccount = new Account({
            fname: fname,
            lname: lname,
            email: email,
            username: username,
            password: password
        });

        newAccount.save(function (err) {
            if (err) return "You Fucked up!";

        });


    });

    //actions to be taken when a user creates a lobby
	socket.on('createLobby', function(ruleSet){

        //generate a join code and make sure it's unique
        while (true) {
    		var duplicate = false;
    		var generatedCode = (Math.floor((Math.random() * 1000))).toString(10);
    		for (var i=0; i < codes.length; i++){
    			if (codes[i].localeCompare(generatedCode) == 0){
    				duplicate = true;
    			}
    		}
    		if (!duplicate){
                codes.push(generatedCode);
    			break;
    		}
        }

        //set the variables for the created lobby
        currentRoom++;
        var room = {
            name: "room" + currentRoom,
            code: generatedCode,
            rules: ruleSet,
            players: []
        }

        //add the lobby to the list of lobbies
        rooms.push(room);

        //add the user to the lobby they just created
        //socket.join(room.name);
        socket.emit('joinAsCreator', generatedCode);

        //debugging/logging statements
        console.log("***************");
        console.log("Created a lobby");
        console.log("Join code: " + room.code);

    });

    //actions to be taken when a user joins a lobby
    socket.on('joinLobby', function(joinCode, nickname){

        var errorMessage = "Please check your join code and try again";
        //compare the join code entered by the user to the join codes of all
        //the lobbies on the server
        //if a match is found, add user to correct lobby
        var joined = false;
        for (var i=0; i < rooms.length; i++){
            if (joinCode.localeCompare(rooms[i].code) == 0){
                if (rooms[i].players.includes(nickname)){
                    errorMessage = "Your nickname is not unique. Please change it and try again";
                }
                else{
                    joined = true;
                    rooms[i].players.push(nickname);
                    socket.join(rooms[i].name);
                    socket.emit('waiting', joinCode);
                    //debugging/logging statements
                    console.log("***************");
                    console.log(nickname + " joined " + rooms[i].name);
                }
            }
        }
        //send error message if the user failes to join
        if (!joined){
            socket.emit('failedToJoin', errorMessage);
        }

    });

    //actions to be taken when a game starts.
    //TODO: MAKE THE GAME LOOP HERE!
    socket.on('startGame', function(code){

        // get random question here
        let questionList = ["DD"];

        dbUtil.getRandomQuestion(6).then((retQuestion)=> {
            questionList = retQuestion;
            console.log("-----------------------LOADED-------------------!");
            // emit socket event to set the question
            socket.emit('prompt1',questionList[0]);
            socket.emit('prompt1',questionList[1]);

            gameLoop();
            console.log(questionList);

        });

        function gameLoop() {
            var room = {};
            for (var i=0; i < rooms.length; i++){
                if (rooms[i].code.localeCompare(code) == 0){
                    room = rooms[i];
                }
            }
            io.to(room.name).emit('roundTransition');
        }

    });

	//actions to be taken when a user disconnects
	socket.on('disconnect', function(socket){
        console.log("user disconnected");
	});

});


//Bind connection to error event (to get notification of connection errors)
qpDB.on('error', console.error.bind(console, 'MongoDB connection error:'));


http.listen(port, function(){
	console.log('listening on *:' + port);
});
