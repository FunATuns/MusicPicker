var ip = "192.168.1.114:7777";
var socket = io.connect(ip); // take your ip out for saftey when pushing
var pointss;
var myProfile = {};
var songsToLoad = null;
var categories = ["general", "selfie", "meme"];
//pay ip: 141.126.155.58:7777

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
  renderSongs();
});

function renderSongs( ) {
  var renderText = "";
  for(var i = 0; i < songsToLoad.length; i++) {
    var song = songsToLoad[i];
    renderText += "<div class='song'>" + song.title + " by " + song.artist + "</div>";
  }
  document.getElementById("songsWrapper").innerHTML = renderText;
}

function search() {
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

function linkFix() {
  for(var i=0;i<a.length;i++){
    a[i].onclick=function(){
      window.location=this.getAttribute("href");
      return false;
    }
  }
}


//username, admin, points, hasPoints, lastPointTime, email

socket.on("Profile", function(inf) {
 
  if(document.getElementById("prof") != null && document.getElementById("prof") != undefined){
    document.getElementById("userPlace").innerHTML = inf.profile.username;
    document.getElementById("ptsholder").innerHTML = inf.profile.scores.overall;
    document.getElementById("bio").innerHTML = inf.profile.bio;
    document.getElementById("prec").setAttribute("src", getAvatarURL(inf.profile.username));
    var finalCat = [];
      for(i = 0; categories.length > i; i++) {
        if(inf.profile.scores[categories[i]]) {
          inf.profile.scores[categories[i]].type = categories[i];
          finalCat.push(inf.profile.scores[categories[i]]);
        }
      }
      makeTiles(finalCat);
    if(getParameterByName("username") == undefined || getParameterByName("username") == null) {
      document.getElementById("editProf").innerHTML = "edit";
      localStorage.setItem("username", inf.profile.username);
    }
  }  
  else if(document.getElementById("profpic") != null && document.getElementById("profpic") != undefined){
    document.getElementById("picupload").setAttribute("name", localStorage.getItem("key"));
    myProfile = inf.profile;
    document.getElementById("edprf").setAttribute("src", getAvatarURL(inf.profile.username));
  }
  else if(document.getElementById("uploadbox") != null  ){
    document.getElementById("uploadboxupload").setAttribute("name",pageCategory + " " + localStorage.getItem("key"));
    myProfile = inf.profile;
  }
});

function getParameterByName(name, url) { 
  if (!url)  
    url = window.location.href; 
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url); 
  if (!results) 
    return null; 
  if (!results[2]) 
    return ''; 
  return decodeURIComponent(results[2].replace(/\+/g, " ")); 
}

$("#picupload").change(function(){
  document.getElementById("sendProf").style.backgroundColor = "#4B1B1E";
  document.getElementById("sendProf").style.display = "block";
});

$("#uploadboxupload").change(function(){
  document.getElementById("uploadboxlabel").style.opacity = "0";
  setTimeout(function(){
    document.getElementById("uploadboxlabel").style.display = "none";
    document.getElementById("uploadboxsubmit").style.display = "block";
    document.getElementById("uploadboxcancel").style.display = "block";
    
    setTimeout(function(){
      document.getElementById("uploadboxsubmit").style.opacity = "1";
      document.getElementById("uploadboxcancel").style.opacity = "1";
    }, 100);
    
  }, 1000);
  
});

$("#uploadboxcancel").click(function(){
  document.getElementById("uploadboxlabel").style.display = "block";
  document.getElementById("uploadboxsubmit").style.display = "none";
  document.getElementById("uploadboxcancel").style.display = "none";
});

$("#lowerright").click(function(event){
  window.location = "leaderboard.html";
});

function makeTiles(finalCategories){
  document.getElementById("catTiles").innerHTML = "";
  for(i = 0; finalCategories.length> i; i++){
    document.getElementById("catTiles").innerHTML += "<div id='" + finalCategories[i].type + "tile' class='catTile'>" + finalCategories[i].type.charAt(0).toUpperCase() + finalCategories[i].type.slice(1) + "<p class='tileScore'>" + finalCategories[i].score + "</p></div>";
    if((i+1)%2 == 0) {
      document.getElementById("catTiles").innerHTML += "<br>";
    }
  }
}

function updateBio(){
  socket.emit("UpdateBio", localStorage.getItem("key"), document.getElementById("newBio").value);
  document.getElementById("newBio").setAttribute("placeholder", "Bio updated!");
  document.getElementById("newBio").value = "";
  setTimeout(function(){
    document.getElementById("newBio").setAttribute("placeholder", "Enter your new bio here...");
  }, 3000);
}

$("#edtbackarrow").onclick(function(){
  window.location = "profile.html?user=" + localstorage.getItem('username');
});