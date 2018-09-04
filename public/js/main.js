var ip = "141.126.155.58:7778";
/*
  Payton's PC [Dev] :: 141.126.155.58:7777
  Production Server [Live] :: 141.126.155.58:7778
*/
var socket = io.connect(ip); // take your ip out for saftey when pushing
var pointss;
var myProfile = {};
var songsToLoad = null;
//pay ip: 141.126.155.58:7777
sessionStorage.setItem("adminlog", false);
var unaccepted = [];

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
        renderText += "<div class='song' id='" + song.youtubeId + "'><div class='abcover' style='background-image:url(\"" + song.coverUrl + "\")'><div class='graycov'></div></div><p>" + song.title + " by " + song.artist + "</p><div class='iconCnt' id='l" + song.youtubeId + "' onclick='songPick(\"" + song.youtubeId + "\")'><i class='fa fa-thumbs-up' aria-hidden='true'></i></div></div>";
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
  document.getElementById("l" + songID).innerHTML = "<div class='songcirc'></div>"
  socket.emit("Vote", localStorage.getItem("key"), songID);
  setTimeout(function(){
    document.getElementById("l" + songID).innerHTML = "<section class='container'><figure class='chart' data-percent='100'><i class='fa fa-check incirc' id='circ" + songID + "' aria-hidden='true'></i><svg width='200' height='200' style='transform: scale(.65); margin-top: -95px; position: absolute; right: -50px;'><circle class='outer' cx='95' cy='95' r='85' transform='rotate(-90, 95, 95)'/></svg></figure></section>";
    setTimeout(function(){
      document.getElementById("circ" + songID).style.opacity = "1";
    },750);
  },700);
}

function undoPick(songID){
  socket.emit("UnVote", localStorage.getItem("key"), songID);
}

socket.on("Voted", function(data){
  myProfile = data;
  renderSongs();
});

function mySongs(){
  document.getElementById("songsWrapper").innerHTML = "<div class='loader'></div>"
  socket.emit("GetLiked", localStorage.getItem("key"));
}

function logAd(){
  var userpass = document.getElementById("adpass").value;
  if(userpass == "shithead14"){
    sessionStorage.setItem("adminlog", true);
    document.getElementById("adOverlay").style.display = "none";
    document.getElementById("hidad").style.display = "block";
  }
}

function getUnapproved(){
  if(sessionStorage.getItem("adminlog")){
    socket.emit("GetUnapproved");
  }
  else {
    alert("Missing valid admin key! Sending you to the login...");
    setTimeout(function(){
      document.getElementById("adOverlay").style.display = "block";
      document.getElementById("adOverlay").style.display = "none";
    },1000);
  }
}

socket.on("Gotem", function(users){
  document.getElementById("userSpot").innerHTML = "";
  for(i = 0; users.length > i; i++) {
    document.getElementById("userSpot").innerHTML += "<div class='userContainer'><div class='likecnt' onclick='accUser(\"" + users[i].key + "\")'><i class='fa fa-thumbs-up' aria-hidden='true'></i></div><p class='adusername'>" + users[i].name + "</p><div class='dislikecnt' onclick='delUser(\"" + users[i].key + "\")'><i class='fa fa-thumbs-down' aria-hidden='true'></i></div></div>"
  }
  var elem = document.getElementById("userSpot");
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
});

function accUser(id){
  socket.emit("Approve", id);
}

function delUser(id){
  socket.emit("Disapprove", id);
}