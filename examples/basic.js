'use strict';

//const fetch = require('node-fetch');

const FB = require('../lib/fbutil');

const DW = require('../lib/dw');

let Wit = null;
let interactive = null;


try {
  // if running from repo
  Wit = require('../').Wit;
  interactive = require('../').interactive;
} catch (e) {
  Wit = require('node-wit').Wit;
  interactive = require('node-wit').interactive;
}

const accessToken = (() => {
  if (process.argv.length !== 3) {
    console.log('usage: node examples/basic.js <wit-access-token>');
    process.exit(1);
  }
  return process.argv[2];
})();
const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    const {text, quickreplies} = response;
    console.log(response);
    if(quickreplies){
      FB.setQuickReplies(quickreplies,text);
    }
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  merge(context){
    
    console.log('in merge',context);
    
    return new Promise(function(resolve, reject) {
      DW.setEntityValues(context,false);
      console.log('context in merge',context.context);
      resolve(context.context);
    });
  },
  productSearch(context){
    console.log('in product Search',context);
    console.log('context in product Search',context.context); 
    DW.searchProductOnDemandWare(context.context);
  } 
};

const client = new Wit({accessToken, actions});
var callbackToken = function(error,response,body){
    if(!error && response.statusCode == 200){
       process.env['JWT_TOKEN'] = response.headers['authorization'];
       console.log('JWT_TOKEN =',process.env.JWT_TOKEN);
       createBasket(callBackBasketCreate);
    }else{
      console.log('Error while retriving token ', body);
    }
}
var callBackBasketCreate = function (error,response,body) {
    if(!error && response.statusCode == 200){
       var bodyItem = JSON.parse(body);
       process.env.BASKET_ID = bodyItem.basket_id; 
       console.log('BASKET ID =', process.env.BASKET_ID);
    }else{
      console.log('Error while creating basket ', body);
    }
}
const cbForToken =(()=>{
      //DW.getJWTToken(callbackToken);
})();
const createBasket =(callBackBasketCreate)=>{
      DW.createBasket(callBackBasketCreate);
}
interactive(client);
