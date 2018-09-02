// Setup basic express servernpm install
var debug = true;

var port = debug ? 7777 : 27016;

var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var formidable = require('express-formidable');

var songSearch = require('song-search');
 


var dbready = false;
var LoginDB = null;
var SongDB = null;

server.listen(port, function() {
  console.log('Server listening at port %d', port);
});
// Routing
app.use('/', express.static(__dirname + '/public')); 

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(bodyParser.json()); // support json encoded bodies

var MongoClient = require('mongodb').MongoClient;

// Connection URL 
var url = 'mongodb://localhost:27017/musicpicker';
// Use connect method to connect to the Server 

MongoClient.connect(url, function(err, db) {
  if (err == null) {
    console.log("Connected correctly to server");
    LoginDB = db.collection('users');
    SongDB = db.collection('songs');
    dbready = true;

  }
});



io.on('connection', function(socket) {
  console.log('User Connected');
  // when the client emits 'add user', this listens and executes
  socket.on('SearchSongs', function(key,search) { 
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
      }

      songSearch.search({
        search: search,
        limit: 7, // defaults to 50
        itunesCountry: 'us', // defaults to 'us'
        youtubeAPIKey: '',
      }, function(err, songs) {
        socket.emit("ProfileData",profile);
        socket.emit("SongSearch", songs);
      });

    });
  });

  socket.on('Register', function(data) {
    console.log("Register attempt");
    // Data format:  data: { fname: "fname", lname: "lname", username: "username", password: "password", contact: "contact"}
    LoginDB.findOne({username: data.username}).then(function (testProfile) { // get profile with username
      if(testProfile != null) { // does such profile exist?
        socket.emit("Error", "Username is not unique, please pick another username or check if you already have an account."); // if yes emit a fail with non unique username
        console.log("Register Fail: usernameNotUnique");
      }
      else if (!hasWhiteSpace(data.username) && data.username.length < 15) { // if no check some parameters
        var profile = { // make account
          name: data.fname + " " + data.lname,
          username: data.username,
          password: data.password,
          admin: 0,
          approved: false,
          key: keyGen(),
          contact: data.contact,
          numpickedsongs: 0,
          pickedsongs:[]
        };

        LoginDB.insertOne(profile).then(function(item) { // push account
          socket.emit("Redirect", "landing.html","You have successfully registered! Your account is not approved yet, but Payton will approve it next time he has a chance (feel free to bug him). Once your account is approved you can login to the site and start picking music! Thanks for registering!"); // emit success
          console.log("Register Success");
        });
      } 
      else {
        if(hasWhiteSpace(data.username)) { // deal with problem
          socket.emit("Error", "Username has whitespace, please remove the spaces/enters in your username.");
          console.log("Register Fail: hasWhiteSpace");
        }
        else if (data.username.length >= 15) {
          socket.emit("Error", "Your username too long boi.");
          console.log("Register Fail: tooLong");
        }
      }
    });
  });

  socket.on('Login', function(data) {
    LoginDB.findOne({username:data.username}).then(function(profile) {
      if(profile == null) {
        socket.emit("Error", "Incorrect username.");
        console.log("Login Fail: accountDoesntExist");
      }
      else {
        if (data.password == profile.password) {
          if(profile.approved) {
            socket.emit("Key",profile.key);
            socket.emit("Redirect", "main.html","Login successful! To vote for a song click the big green 'Vote' button next to it! The top most voted songs will be submitted to the DJ at homecoming. Happy voting!"); // emit success
            console.log("Login Success");
          }
          else {
            socket.emit("Error", "Your account is not approved, wait until Payton approves your account for music selection. You can bug them if you want!");
          }
          
        } 
        else {
          socket.emit("Error", "Incorrect password.");
          console.log("Login Fail: wrongPassword");
        }
      }
    });
  });

  

  socket.on('Leaderboard', function(type) { 
    getBoard(type, function (board) {
      socket.emit("Leaderboard", board);
    });
  });

  socket.on('Profile', function(data) {
    LoginDB.findOne({key:data.key}).then(function(profile) {
      if(profile == null) {
        socket.emit("Profile", {
          status: "fail",
          type: "invalidKey",
          profile: {}
        });
        console.log("Profile Fail: invalidKey");
      }
      if(data.username == "" || !data.username ) {
        socket.emit("Profile", {
          status: "success",
          type: "",
          profile: profile
        });
        console.log("Profile Success");
      }
      else {
        LoginDB.findOne({username:data.username}).then(function(otherProfile) {
          if(otherProfile == null) {
            socket.emit("Profile", {
              status: "fail",
              type: "invalidUsername",
              profile: {}
            });
            console.log("Profile Fail: invalidUsername");
          }
          else  {
            otherProfile.key = "";
            otherProfile.password = "";
            socket.emit("Profile", {
              status: "success",
              type: "",
              profile: otherProfile
            });
            console.log("Profile Success");
          }
        });
      }


    });
  });

  socket.on('disconnect', function() {

  });
});

function profileExists(username) {
  LoginDB.findOne({username: username}).then(function(item) {
    if (item == null) {
      console.log("[" + username + "] Account doesn't exist");
      return false;
    } else {
      console.log("[" + data.username + "] Account exists");
      return true;
    }
  });
}

function getProfileByKey(str) {
  LoginDB.findOne({key: key}).then(function(item) {
    return item;
  });
  return null;
}


function keyGen() {
  var key = "";
  for (var i = 0; i < 3; i++) {
    key += getRandomInt(1, 9);
  }

  key +=  String(Date.now());
  console.log(key);
  return key;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hasWhiteSpace(str) {
  return str.indexOf(' ') >= 0;
}


function getTwoImages(profile, type, send) {
  ImageDB.aggregate([{
    $match: {'type': type}}, {
    $match: {ownerKey: {$ne: profile.key}}}, {
		$sample: {size: 1}
	}], function(err, result1) {
		if (result1.length == 1) {
      ImageDB.aggregate([{
        $match: {'type': type}}, {
        $match: { ownerKey: {$ne: profile.key}}},  {
        $match: { ownerKey: {$ne: result1[0].ownerKey}}},  {
        $sample: {size: 1}
      }], function(err, result2) {
    
        if (result2.length == 1) {
          send(result1[0], result2[0]);
        }
        else {
          send("haha", "lmao");
        }
      });
		}
		else {
			send("haha", "lmao");
		}
	});
	return null;
}

function getBoard (type,withBoard) {
  if(type == "overall") {
    LoginDB.find().sort({'scores.overall': -1}).toArray(function(err,board) {
      var actualBoard = [];
      for(var i = 0; i < board.length; i++) {
        actualBoard[i] = {
          username: board[i].username,
          score: board[i].scores.overall,
          place: (i+1)
        };
      }
  
      withBoard(actualBoard);
    });
  }
  else {
    var thequery ={ };
    thequery["scores." + type] = { $exists: true };
    LoginDB.find(thequery).toArray(function(err,board) {
      board.sort(function(a,b) {
        return b.scores[type].score - a.scores[type].score;
      }); 
      var actualBoard = [];
      for(var i = 0; i < board.length; i++) {
        actualBoard[i] = {
          username: board[i].username,
          score: board[i].scores[type].score,
          place: (i+1)
        };
      }

      actualBoard.sort(function(a,b) {
        return b.score - a.score;
      }); 
  
      withBoard(actualBoard);
    });
  }
}

function checkSong(song) {
  console.log(song.youtubeId);
  var songObj = {
    title: song.title,
    artist: song.artist,
    album: song.album,
    genre: song.genre,
    coverUrl: song.coverUrl,
    youtubeId: song.youtubeId,
    voteAmount: 0,
    votes: []
  };
  SongDB.findOne({youtubeId:song.youtubeId}).then(function (gnos) { 
    console.log(gnos);
    if(gnos == null ) {
      SongDB.insertOne(songObj);
    }            
  });
}