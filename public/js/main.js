var ip = "http://68.234.71.226:7777";
var socket = io.connect(ip); // take your ip out for saftey when pushing
var pointss;
var myProfile = {};
var songsToLoad = null;
//pay ip: 141.126.155.58:7777

var ua = navigator.userAgent.toLowerCase(); 
if (ua.indexOf('safari') != -1) { 
  if (ua.indexOf('chrome') > -1) {
    //alert("1") // Chrome
  } else {
    var landingPic = document.getElementsByClassName("landingPick");
    for(i = 0; landingPic.length > i; i++) {
      landingPic[i].style.height = "calc(50vh - 92px)";
    }
  }
}


$("#registerPick").click(function (e) {
  window.location = "register.html";
});


$("#loginPick").click(function (e) {
  window.location = "login.html";
});

socket.on("Error",function (data) {
  alert(data);
});

socket.on("Redirect",function (data,msg) {
  if(msg != "")
    alert(msg);
  window.location = data;
});

socket.on("Key",function (data) {
  localStorage.setItem("key",data);
});

socket.on("ProfileData",function (data) {
  myProfile = data;
});

socket.on("SongSearch",function (data) {
  songsToLoad = data;
  console.log(data);
  renderSongs();
});

function renderSongs( ) {
  var renderText = "";
  for(var i = 0; i < songsToLoad.length; i++) {
    var song = songsToLoad[i];
    if(song.title && song.artist && song.youtubeId) {
      if(myProfile.pickedsongs.includes(song.youtubeId)) {
        renderText += "<div class='song' id='" + song.youtubeId + "'><div class='abcover' style='background-image:url(\"" + song.coverUrl + "\")'><div class='graycov'></div></div><p>" + song.title + " by " + song.artist + "</p><div class='iconCnt' onclick='undoPick(\"" + song.youtubeId + "\")'><i class='fa fa-check' aria-hidden='true'></i></div></div>";
      }
      else {
        renderText += "<div class='song' id='" + song.youtubeId + "'><div class='abcover' style='background-image:url(\"" + song.coverUrl + "\")'><div class='graycov'></div></div><p>" + song.title + " by " + song.artist + "</p><div class='iconCnt' onclick='songPick(\"" + song.youtubeId + "\")'><i class='fa fa-thumbs-up' aria-hidden='true'></i></div></div>";
      }
    }
  }
  document.getElementById("songsWrapper").innerHTML = renderText;
  var elem = document.getElementById("songsWrapper");
  if (elem.offsetHeight < elem.scrollHeight) {
    elem.style.webkitBoxShadow = "inset 0px -50px 25px -28px rgba(0,0,0,0.90)";
    elem.style.mozBoxShadow = "inset 0px -50px 25px -28px rgba(0,0,0,0.90)";
    elem.style.boxShadow = "inset 0px -50px 25px -28px rgba(0,0,0,0.90)";
  }
  else {
    elem.style.webkitBoxShadow = "0";
    elem.style.mozBoxShadow = "0";
    elem.style.boxShadow = "0";
  }
}

function search() {
  document.getElementById("songsWrapper").innerHTML = "<div class='loader'>"
  var key = localStorage.getItem("key");
  var search = document.getElementById("songSearch").value;

  socket.emit("SearchSongs", key, search);
}

function login() {
  socket.emit("Login",{username: document.getElementById("logUsername").value, password: document.getElementById("logPassword").value })
}

function register() {
  var fname = document.getElementById("regFName").value;
  var lname = document.getElementById("regLName").value;
  var username = document.getElementById("regUsername").value;
  var password1 = document.getElementById("regPassword1").value;
  var password2 = document.getElementById("regPassword2").value;
  if(password1 == password2) {
    socket.emit("Register",{fname: fname, lname: lname, username: username, password: password1, contact: ""});
  }
  else {
    alert("Passwords do not match");
  }
}

function songPick(songID){
  socket.emit("Vote", localStorage.getItem("key"), songID);
}

function undoPick(songID){
  socket.emit("UnVote", localStorage.getItem("key"), songID);
}

socket.on("Voted", function(data){
  myProfile = data;
  renderSongs();
});

function mySongs(){
  document.getElementById("songsWrapper").innerHTML = "<div class='loader'>"
  socket.emit("GetLiked", localStorage.getItem("key"));
}