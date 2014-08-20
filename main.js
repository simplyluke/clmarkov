//--------------------- Requirements ------------------------

// request because I'm too lazy to do an http.get
var request = require('request');
// cheerio is basically jquery
var cheerio = require('cheerio');
// also too lazy to do my own api calls
var twitterApi = require('node-twitter-api');
// secrets will be our api keys for twitter, don't want those on github!
var secrets = require('./secret');



//--------------------- Functions ---------------------------

// scrape CL, call the other functions to make and post the markov chain
// this is the function we call to make magic happen
function gen_markov() {
  // Scrape CL missed connections headlines
  request('http://austin.craigslist.org/mis/', function(error, response, body) {
    var final_text = [];
    if (!error && response.statusCode == 200) {
      var $ = cheerio.load(body);
      // Scrape the response HTML according to craigslist's (incredibly fucking messy) DOM layout
      var links = $(body).find('a.hdrlnk').each(function(i, elem){
        var split_link = $(this).text().split(' -');
        final_text.push((split_link[0]));
      });
    } 
    // make the markov *after* the request. Thanks, async
    post_to_twitter(markov(final_text));
  });
}

function markov(final_text) {
  var terminals = {};
  var startwords = [];
  var wordstats = [];
  for (var i = 0; i < final_text.length; i++){
    var words = final_text[i].split(' ');
    terminals[words[words.length-1]] = true;
    startwords.push(words[0])
    for (var j = 0; j < words.length-1; j++) {
      if (wordstats.hasOwnProperty(words[j])) {
          wordstats[words[j]].push(words[j+1]);
      } else {
          wordstats[words[j]] = [words[j+1]];
      }
    }
  }
  var choice = function(a) {
    var i = Math.floor(a.length * Math.random());
    return a[i];
  };

  var make_title = function(min_length) {
    word = choice(startwords);
    var title = [word];
    while (wordstats.hasOwnProperty(word)) {
      var next_words = wordstats[word];
      word = choice(next_words);
      title.push(word);
      if (title.length > min_length && terminals.hasOwnProperty(word)) break;
    }
    if (title.length < min_length) return make_title(min_length);
    return title.join(' ');
  };
  return(make_title(3 + Math.floor(3 * Math.random())));
}

function post_to_twitter(tweet) {
  var twitter = new twitterApi({
    consumerKey: secrets.api_key,
    consumerSecret: secrets.api_secret
  });
  // post that tweet, yo
  twitter.statuses("update", {
      status: tweet
    },
    secrets.access_token, 
    secrets.access_secret,
    function(error, data, response) {
      if(error) {
        console.log('something definitely went wrong');
      } else {
        console.log('check twitter!')
      }
    }
  );
}

gen_markov();
// fire off a tweet every 30 minutes
setInterval(function(){
  gen_markov();
  // 60s * 1000ms * 30m = 1800000
}, 1800000);
