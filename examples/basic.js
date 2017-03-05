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
      setEntityValues(context,false);
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

//Update entity values
const setEntityValues =(context,reset) =>{
   
   if(reset)
   context.context = {};

   Object.keys(context.entities).forEach(function(key){
        context.context[key] = context.entities[key][0].value;
    });
    //set no query if search_query is not existing,
    if(!context.context.hasOwnProperty('search_query')){
        context.context["no_query"] =  true;
    }else if(context.context.no_query){
        delete context.context.no_query;  
    }

}
const client = new Wit({accessToken, actions});
interactive(client);
