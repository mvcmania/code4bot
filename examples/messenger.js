'use strict';

// Messenger API integration example
// We assume you have:
// * a Wit.ai bot setup (https://wit.ai/docs/quickstart)
// * a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)
// You need to `npm install` the following dependencies: body-parser, express, request.
//
// 1. npm install body-parser express request
// 2. Download and install ngrok from https://ngrok.com/download
// 3. ./ngrok http 8445
// 4. WIT_TOKEN=your_access_token FB_APP_SECRET=your_app_secret FB_PAGE_TOKEN=your_page_token node examples/messenger.js
// 5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/webhook` as callback URL.
// 6. Talk to your bot on Messenger!

const bodyParser = require('body-parser');
const express = require('express');
const request = require('request');
const client_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

const dmw = require('../lib/dmware'); 
const FB = require('../lib/fbutil');

//const request = require('request');

let Wit = null;
let log = null;
try {
  // if running from repo
  Wit = require('../').Wit;
  log = require('../').log;
} catch (e) {
  Wit = require('node-wit').Wit;
  log = require('node-wit').log;
}

// Webserver parameter
const PORT = process.env.PORT || 8445;

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN || "WZWA3TCASGIBZINFXKYNQKEN4BNMNCEN";

//Wit api url 
const WIT_API_URL = 'https://api.wit.ai';


let FB_VERIFY_TOKEN = null;
FB_VERIFY_TOKEN = 'code4botsecret';//process.env.FB_VERIFY_TOKEN;
/*crypto.randomBytes(8, (err, buff) => {
  if (err) throw err;
  FB_VERIFY_TOKEN = buff.toString('hex');
  console.log(`/webhook will accept the Verify Token "${FB_VERIFY_TOKEN}"`);
});*/
// ----------------------------------------------------------------------------
// Wit.ai bot specific code

// This will contain all user sessions.
// Each session has an entry:
// sessionId -> {fbid: facebookUserId, context: sessionState}
const sessions = {};

const findOrCreateSession = (fbid) => {
  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
    }
  });
  if (!sessionId) {
    // No session found for user fbid, let's create a new one
    sessionId = new Date().toISOString();
    sessions[sessionId] = {fbid: fbid, context: {}};
  }
  return sessionId;
};

//Response manipulated response, could be used for quick responses
var quickRepliesArray= [];
//hold the search state
var searchState = false;

// Our bot actions
const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    var {text, quickreplies} = response;
    // Our bot has something to say!
    // Let's retrieve the Facebook user whose session belongs to
    const recipientId = sessions[sessionId].fbid;

    if (recipientId) {
      // Yay, we found our recipient!
      // Let's forward our bot response to her.
      // We return a promise to let our bot know when we're done sending
      //text ='<a href="">abc</a>';
      if(quickreplies){
         text = setQuickReplies(quickreplies,text);
      }
      console.log(text);
      return FB.fbMessage(recipientId, text)
      .then(() => null)
      .catch((err) => {
        console.error(
          'Oops! An error occurred while forwarding the response to',
          recipientId,
          ':',
          err.stack || err
        );
      });
    } else {
      console.error('Oops! Couldn\'t find user for session:', sessionId);
      // Giving the wheel back to our bot
      return Promise.resolve()
    }
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  setIntentAndCategory(context){
    console.log('setIntentAndCategory',JSON.stringify(context));
  
   setEntityValues(context,true);
   return new Promise(function(resolve,reject){
      resolve(context);
   })
    /*var intentContext = context;
    //intents array
    var intents = intentContext.entities.intent;

    console.log(intents[0].value);
    //if intent is only one , we may check the confidence value
    if(intents.length == 1){
       setQuickReplies(intents[0].value,quickRepliesArray);
    }*/
  },
  setGender(context,entities){
    console.log('Set gender type : ',JSON.stringify(context));
    console.log('Set gender type entity: ',JSON.stringify(entities));
  },
  productSearch(context,entities){
    searchState = true;
    console.log('Product Search : ',JSON.stringify(context));
      var params ={
        client_id : client_id,
        refine_1 : "cgid=" + extractCategory(),
        q : 'dress',
        expand : "images",
        count : 10,
        start : 0,
        sort : "title"
    }; 
    setEntityValues(context,false);
    console.log('Context Map: ',JSON.stringify(contextMap));
    var recipientId = sessions[context.sessionId].fbid;
    dmw.searchProducts(params)
      .then(function (fbResponse){
          searchState = false;
          console.log('recipientId',recipientId);
          console.log('fbResponse',fbResponse);
          FB.fbMessage(recipientId,fbResponse);
      })
      .catch(function (err) {
        searchState = false;
        console.log('err',err);
        console.log(err)
      }); 
  }
};
//***************CUSTOM METHODS STARTS *************************/

//Update entity values 
const setEntityValues =(context,reset) =>{
   Object.keys(context.entities).forEach(function(key){
        var tempKey = key.replace(/_/g,'-');
        context[tempKey] = context.entities[key][0].value;
    });
}
const resetContextMap=()=>{
  return {
        "womens-clothing" : "",
        "mens-clothing" : "",
        "mens-accessories" :"",
        "womens-accessories" :"",
        "jewelry":"",
        "search_query":"",
        "electronics":""
      };
}
var contextMap =  resetContextMap();
//Extract category id 
const extractCategory = ()=>{
  var categoryid= '';
  Object.keys(contextMap).forEach(function(key){
       if(contextMap[key] !='' && (key!='search-query' && key!='intent')){
          key = key.replace(/_/g,'-');
          categoryid+= key +'-'+contextMap[key];
       }
       return categoryid;
    });
    return categoryid;
}
//Get the dynamic quick reply options from entity metadata
const setQuickReplies = (quickReplyArray,actualText) => {
  var qArray = [];
  if(quickReplyArray){
      quickReplyArray.forEach(function(v){
            var item = {
              "content_type" : "text",
              "title" : v,
              "payload" : v
            };
            qArray.push(item);
      });
    //FB quick reply template
    //See the docs
    //https://developers.facebook.com/docs/messenger-platform/send-api-reference/quick-replies
    var quickReplyResponse = {
            "text" : actualText,
            "quick_replies":[]
          };
    quickReplyResponse["quick_replies"]=qArray;
    return quickReplyResponse;
  }
}
//***************CUSTOM METHODS END *************************/
// Setting up our bot
const wit = new Wit({
  accessToken: WIT_TOKEN,
  actions,
  logger: new log.Logger(log.INFO)
});

// Starting our webserver and putting it all together
const app = express();
app.use(({method, url}, rsp, next) => {
  rsp.on('finish', () => {
    console.log(`${rsp.statusCode} ${method} ${url}`);
  });
  next();
});
app.use(bodyParser.json({ verify: FB.verifyRequestSignature }));

// Webhook setup
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] ===  FB_VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

// Message handler
app.post('/webhook', (req, res) => {
  // Parse the Messenger payload
  // See the Webhook reference
  // https://developers.facebook.com/docs/messenger-platform/webhook-reference
  const data = req.body;

  if (data.object === 'page') {
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
        if (event.message && !event.message.is_echo) {
          // Yay! We got a new message!
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;

          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history
          const sessionId = findOrCreateSession(sender);

          // We retrieve the message content
          const {text, attachments} = event.message;
        
          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            FB.fbMessage(sender, 'Sorry I can only process text messages for now.')
            .catch(console.error);
          } else if (text) {
            console.log('fb text',text);
            // We received a text message

            // Let's forward the message to the Wit.ai Bot Engine
            // This will run all actions until our bot has nothing left to do
            wit.runActions(
              sessionId, // the user's current session
              text, // the user's message
              sessions[sessionId].context // the user's current session state
            ).then((context) => {
              // Our bot did everything it has to do.
              // Now it's waiting for further messages to proceed.
              console.log('Waiting for next user messages');

              // Based on the session state, you might want to reset the session.
              // This depends heavily on the business logic of your bot.
              // Example:
              // if (context['done']) {
              //   delete sessions[sessionId];
              // }
              // Updating the user's current session state
              sessions[sessionId].context = context;
            })
            .catch((err) => {
              console.error('Oops! Got an error from Wit: ', err.stack || err);
            })
          }
        } else {
          console.log('received event', JSON.stringify(event));
          FB.fbMessage(event.sender.id, 'Welcome to the OSF DemanWare Store! How can i help you!');
        }
      });
    });
  }
  res.sendStatus(200);
});

app.listen(PORT);
console.log('Listening on :' + PORT + '...');