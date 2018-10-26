// Setup basic express servernpm install
var live = false;

var port = "7777";//live ? 7778 : 7777;

var express = require('express');
var bodyParser = require('body-parser');

var config = require('./config.json');
var multer = require('multer');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var fs = require('fs');
var formidable = require('express-formidable');
var request = require('request');
var songSearch = require('song-search');
var youtubeAPIKey = "";
request('http://localhost:80/youtubeapi.json', function (error, response, body) {
  youtubeAPIKey = body;
});

logger("Test");

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

MongoClient.connect(url, function(err, client) {
  if (err == null) {
    var db = client.db('musicpicker');
    console.log("Connected correctly to server");
    LoginDB = db.collection('users');
    SongDB = db.collection('songs');
    dbready = true;

  }
});

var recentSongs = [];


io.on('connection', function(socket) {
  // when the client emits 'add user', this listens and executes
  socket.on('GetUnapproved', function(data) {  
    LoginDB.find({approved: false} ).toArray().then(function(accounts) {
      socket.emit("Gotem", accounts);
    });
  });

  socket.on('Approve', function(key) {  
    LoginDB.findOne({key: key}).then(function (profile) { 
      profile.approved = true;
      LoginDB.replaceOne({key:profile.key},profile);
      logger(profile.name + " just got approved");
      LoginDB.find({approved: false} ).toArray().then(function(accounts) {
        socket.emit("Gotem", accounts);
      });
    });
  });

  socket.on('Disapprove', function(keyss) { 
    LoginDB.findOne({key: keyss}).then(function (profile) { 
      logger(profile.name + " just got disapproved");
      LoginDB.remove({key:keyss});
      LoginDB.find({approved: false} ).toArray().then(function(accounts) {
        socket.emit("Gotem", accounts);
      });
    });
  });

  socket.on('GetLiked', function(key) {  
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
        return;
      }
      logger("Fetching liked songs for " + profile.name);
      getNextSong(0,profile.pickedsongs,[],socket, profile);

    });
  });

  socket.on('GetRecent', function(key) {  
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
        return;
      }
      logger("Fetching recent songs for " + profile.name);
      if(recentSongs.length == 0) {
        socket.emit("Error","No recently liked songs, go like one to add it here and for others! :)");
        logger("No recent songs");
      }
      else {
        getNextSong(0,recentSongs,[],socket, profile);
      }
    });
  });

  socket.on('GetTop', function(key) {  
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
        return;
      }
      logger("Fetching top songs for " + profile.name);

      SongDB.find().sort({voteAmount: -1}).limit(10).toArray(function(err,topSongs) {
        if(topSongs.length == 0) {
          socket.emit("Error","No top liked songs, go like one to add it here and for others! :)");
          logger("No top songs");
        }
        else {
          socket.emit("ProfileData",profile);
          socket.emit("SongSearch",topSongs);
        }
      });

      
    });
  });

  socket.on('SearchSongs', function(key,search) { 
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        console.log("search song");
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
      }
      logger(profile.username + " searched '" + search + "'");
      songSearch.search({
        search: search,
        limit: 11, // defaults to 50
        itunesCountry: 'us', // defaults to 'us'
        youtubeAPIKey: youtubeAPIKey,
      }, function(err, songs) {
        if(songs) {
          logger(songs.length + " songs have been retrieved");
          for(var i in songs) {
            checkSong(songs[i]);
          }
          socket.emit("ProfileData",profile);
          socket.emit("SongSearch", songs);
        }
      });
    });
  });

  socket.on('Vote', function(key, songID) {
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
      }
      SongDB.findOne({youtubeId: songID}).then(function(song) {
        if(song == null) {
          socket.emit("Error","This song doesn't exist for some reason. If you see this please contact Payton lol");
          return;
        }
        else {
          if(profile.pickedsongs.includes(song.youtubeId)) {

          }
          else {
            profile.pickedsongs.push(song.youtubeId);
            profile.numpickedsongs = profile.pickedsongs.length;
          }

          if(song.votes.includes(profile.key)) {

          }
          else {
            song.votes.push(profile.key);
            song.voteAmount = song.votes.length;
          }

          if(!recentSongs.includes(song.youtubeId)) {
            recentSongs.unshift(song.youtubeId);
            if(recentSongs.length > 10) {
              recentSongs.splice(10,1);
            }
          }
          

          logger(profile.name + " voted for " + song.title );
          SongDB.replaceOne({youtubeId:song.youtubeId},song);
          LoginDB.replaceOne({key:profile.key},profile);
          socket.emit("Voted",profile);
        }
      });
    });
  });

  socket.on('UnVote', function(key, songID) {
    LoginDB.findOne({key: key}).then(function (profile) { 
      if(profile == null) {
        socket.emit("Redirect", "landing.html","Woah there, you need to login again (not your fault payton made a bad app)");
        return;
      }
      SongDB.findOne({youtubeId: songID}).then(function(song) {
        if(song == null) {
          socket.emit("Error","This song doesn't exist for some reason. If you see this please contact Payton lol");
          return;
        }
        else {
          if(!profile.pickedsongs.includes(song.youtubeId)) {

          }
          else {
            for(var i = 0; i < profile.pickedsongs.length; i++) {
              if(profile.pickedsongs[i] == song.youtubeId) {
                profile.pickedsongs.splice(i,1);
                profile.numpickedsongs = profile.pickedsongs.length;
              } 
            }
          }

          if(!song.votes.includes(profile.key)) {

          }
          else {
            for(var i = 0; i < song.votes.length; i++) {
              if(song.votes[i] == profile.key) {
                song.votes.splice(i,1);
                song.voteAmount = song.votes.length;
              } 
            }
          }
          logger(profile.name + " unvoted " + song.title );
          SongDB.replaceOne({youtubeId:song.youtubeId},song);
          LoginDB.replaceOne({key:profile.key},profile);
          socket.emit("Voted",profile);
        }

      });

  
    });
  });

  socket.on('Register', function(data) {
    console.log("Register attempt");
    // Data format:  data: { fname: "fname", lname: "lname", username: "username", password: "password", contact: "contact"}
    LoginDB.findOne({username: data.username}).then(function (testProfile) { // get profile with username
      if(testProfile != null) { // does such profile exist?
        socket.emit("Error", "Username is not unique, please pick another username or check if you already have an account."); // if yes emit a fail with non unique username
        logger("Register fail. Username not unique");
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
          logger(item.name + " has registered successfully");
        });
      } 
      else {
        if(hasWhiteSpace(data.username)) { // deal with problem
          socket.emit("Error", "Username has whitespace, please remove the spaces/enters in your username.");
          logger("Register fail. Username has whitespace");
        }
        else if (data.username.length >= 15) {
          socket.emit("Error", "Your username too long boi.");
          logger("Register fail. Username too long");
        }
      }
    });
  });

  socket.on('Login', function(data) {
    LoginDB.findOne({username:data.username}).then(function(profile) {
      if(profile == null) {
        socket.emit("Error", "Incorrect username.");
        logger("Login fail. Wrong username");
      }
      else {
        if (data.password == profile.password) {
          if(profile.approved) {
            socket.emit("Key",profile.key);
            socket.emit("Redirect", "main.html","Login successful! To vote for a song click the big green 'Vote' button next to it! The top most voted songs will be submitted to the DJ at homecoming. Happy voting!"); // emit success
            logger(profile.name + " logged in successfully");
          }
          else {
            socket.emit("Error", "Your account is not approved, wait until Payton approves your account for music selection. You can bug them if you want!");
          }
          
        } 
        else {
          socket.emit("Error", "Incorrect password.");
          logger("Login fail. Wrong password");
        }
      }
    });
  });

  socket.on('Leaderboard', function(type) { 
    getBoard(type, function (board) {
      socket.emit("Leaderboard", board);
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
  logger("Key generated: " + key);
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
  if(song.title && song.artist) {
    var songObj = {
      title: song.title,
      artist: song.artist,
      album: song.album,
      coverUrl: song.coverUrl,
      youtubeId: song.youtubeId,
      voteAmount: 0,
      votes: []
    };
    SongDB.findOne({youtubeId:song.youtubeId}).then(function (gnos) { 
      if(gnos == null ) {
        SongDB.insertOne(songObj);
      }            
    });
  }
}

function getNextSong(index,list,sendArray,socket,profile) {
    if(index == list.length) {
      socket.emit("ProfileData",profile);
      socket.emit("SongSearch",sendArray);
    }
    else {
      SongDB.findOne({youtubeId:list[index]}).then(function(song) {
        sendArray.push(song);
        index += 1;
        getNextSong(index, list, sendArray, socket,profile);
      });
    }
}

function logger (message) {
  var d = new Date();
  var h = addZero(d.getHours());
  var m = addZero(d.getMinutes());
  console.log("[" + h + ":" + m + "] " + message);
}


function addZero(i) {
  if (i < 10) {
    i = "0" + i;
  }
  return i;
}
