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

const DW = require('../lib/dw');
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

const findOrCreateSession = (fbid,resetContext) => {
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
  if(resetContext){
    sessions[sessionId].context ={};
    process.env.BASKET_ID == undefined;
    process.env.JWT_TOKEN == undefined;
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
         text = FB.setQuickReplies(quickreplies,text);
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
  merge(context){
    
    console.log('in merge %O',context);
    
    return new Promise(function(resolve, reject) {
      DW.setEntityValues(context,false);
      console.log('context in merge',context.context);
      return resolve(context.context);
    });
  },
  productSearch(context){
    console.log('in product Search',context);
    console.log('context in product Search',context.context); 
    DW.searchProductOnDemandWare(context.context)
    .then(function(resp){
        var recipientId = sessions[context.sessionId].fbid;
        FB.fbMessage(recipientId,resp);
    }).catch(function(err){
      console.log('error while retriving products',err);
    });
  }
};

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
     console.log(req.body);
    data.entry.forEach(entry => {
      entry.messaging.forEach(event => {
         console.log('event',event);
        if (event.message && !event.message.is_echo) {
          // Yay! We got a new message!
          // We retrieve the Facebook user ID of the sender
          const sender = event.sender.id;

          // We retrieve the user's current session, or create one if it doesn't exist
          // This is needed for our bot to figure out the conversation history
          const sessionId = findOrCreateSession(sender,false);

          // We retrieve the message content
          const {text, attachments} = event.message;
        
          if (attachments) {
            // We received an attachment
            // Let's reply with an automatic message
            FB.fbMessage(sender, 'Sorry I can only process text messages for now.')
            .catch(console.error);
          } else if (text) {
            console.log('fb text',text);
             console.log('sessions[sessionId].context',sessions[sessionId].context);
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
        } else if(event.postback  && event.postback.payload ){
          console.log('received event', JSON.stringify(event));

            if(event.postback.payload == 'FACEBOOK_WELCOME'){

                  //Delete current user context if it is existed 
                  findOrCreateSession(event.sender.id,true);
                  DW.retrieveCustomObjectValue('BotSettings',1)
                  .then(function(resp){
                      FB.fbMessage(event.sender.id, resp.c_WelcomeMessage);
                  }).catch(function(err){
                      console.log('Error while retriving welcome message',err);
                      FB.fbMessage(event.sender.id, 'Welcome to the OSF DemanWare Store! How can i help you!');
                  });
                  //GEt auth token for each user
                  DW.getJWTToken(callbackToken);
                 
            }else{
                var  payLoadObject = JSON.parse(event.postback.payload.replace(/'/g,'\"'));
                console.log('BASKET ID',process.env.BASKET_ID);

                if(payLoadObject.action=='ADDTOCART'){
                     if(typeof(process.env.BASKET_ID)=="undefined"){
                        DW.createBasket()
                        .then((res)=>{
                            process.env.BASKET_ID = res.basket_id; 
                            console.log('BASKET ID =', process.env.BASKET_ID);
                            DW.addToBasket(payLoadObject.product_id,payLoadObject.quantity)
                            .then(function(resp){
                                FB.fbMessage(event.sender.id,FB.prepareViewBasket());
                            }).catch(function(exp){
                                console.log(exp);
                            });
                        }).catch((err)=>{
                            console.log('error while creating basket',err);
                        });
                     }else{
                          DW.addToBasket(payLoadObject.product_id,payLoadObject.quantity)
                            .then(function(resp){
                                FB.fbMessage(event.sender.id,FB.prepareViewBasket());
                            }).catch(function(exp){
                                console.log(exp);
                            });
                     }
                    
                }
            }
        }
      });
    });
  }
  res.sendStatus(200);
});
var callbackToken = function(error,response,body){
    if(!error && response.statusCode == 200){
       process.env['JWT_TOKEN'] = response.headers['authorization'];
       console.log('JWT TOKEN HAS BEEN GENERATED SUCCESSFULLY',response.headers['authorization']);
       DW.sessionBridge(callbackTokenSessionBridge);
    }else{
      console.log('Error while generating jwt token ', body);
    }
}
var callbackTokenSessionBridge = function(error,response,body){
    if(!error && response.statusCode == 200){
       console.log('SESSION BRIDGE HAS BEEN COMPLETED');
    }else if(error){
      console.log('Error while bridging on sessions ', response);
      console.log('Error while bridging on sessions ', error);
    }
}

//handle session bridge 
app.get('/session',(req,res)=>{
    console.log('BASKETID'+process.env.BASKET_ID);
    console.log('JWT_TOKEN'+process.env.JWT_TOKEN);
    DW.sessionBridge(callbackTokenSessionBridge);
    res.sendStatus(200);
});
app.listen(PORT);
console.log('Listening on :' + PORT + '...');
