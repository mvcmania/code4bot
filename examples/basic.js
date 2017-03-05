'use strict';

//const fetch = require('node-fetch');
const request = require('request');

const FB = require('../lib/fbutil');

let Wit = null;
let interactive = null;
const client_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const siteHost ='https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net';
const siteSuffix = '/s/SiteGenesis/dw/shop/v17_2/product_search';

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
var searchState = false;
const actions = {
  send(request, response) {
    const {sessionId, context, entities} = request;
    const {text, quickreplies} = response;

    return new Promise(function(resolve, reject) {
      console.log('User said .... '+ request.text);
      console.log('Sending...', JSON.stringify(response));
        FB.initalIntents('intent').then((vals)=>{
          console.log('results of getInitialIntents :%O',vals);
          return resolve();
        }).catch((err)=>{
          console.error("Error occured in getInitialIntents %O",err);
          return reject();
        });
    });
  },
  // You should implement your custom actions here
  // See https://wit.ai/docs/quickstart
  setIntentAndCategory(context,entities){

  console.log('setIntentAndCategory',JSON.stringify(context));

  //  setEntityValues(context,true);
   
  //  return new Promise((resolve, reject) => {
  //    return resolve(context);
  //    console.log('Afte setIntentAndCategory',JSON.stringify(context));
  //  });
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
    setEntityValues(context,true);
    return new Promise((resolve, reject) => {
      return resolve(context.context);
    });
    console.log('Set gender type : ',JSON.stringify(context));
    console.log('Set gender type entity: ',JSON.stringify(entities));
  },
  productSearch(context,entities){

    console.log('Product Search : ',JSON.stringify(context));
    //console.log('Product Search entity: ',JSON.stringify(entities));
    setEntityValues(context,false);
    //console.log('Context Map: ',JSON.stringify(contextMap));
    //var recipientId = sessions[context.sessionId].fbid;
    //fbMessage(recipientId,'TEST message');
    searchProductOnDemandWare()
    .then(function(resp){
        console.log('resp',resp);
    })
    .catch(function(err){
        console.log('err',err);
    });
  }
};
/**
 * Search product on demand ware open api
 * https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net/s/SiteGenesis/dw/shop/v17_2/product_search?q=&refine_1=cgid=electronics-televisions-flat-screen&client_id=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&expand=images&count=10&sort=title&start=22
 * @param {*} context
 * @param {*} reset
 */
var searchProductOnDemandWare=()=> {
  var entireURL = siteHost + siteSuffix;
  var productSearchDirectory = '/product_search';
  var q = contextMap['search-query']!="undefined" ? contextMap['search-query'] : '' ;
  var refine_1 = 'cgid=' + extractCategory();
  var expand ='images';
  var count = 10;
  var start = 0;
  var sort = 'title';

  entireURL = (entireURL+'?client_id=' + client_id + '&refine_1=' + refine_1 + '&q='+ q + '&expand=' + expand + '&count=' + count + '&start=' + start + '&sort=' + sort);
  console.log(entireURL);
  return new Promise(function(resolve,reject){
      request(entireURL,
      function(error,response,body){
         console.log('error',error);
         console.log('response.statusCode',response.statusCode);
         console.log('body',body);
          if(!error  && response.statusCode == 200){
            var bodyItem = JSON.parse(body);
            var template = '';
            if(typeof(bodyItem.hits)!="undefined"){
               template =  prepareListTemplate(bodyItem.hits);
            }else{
              template = 'Product not found!';
            }
            resolve(template);
          }else{
            reject(new Error('Failed to load page, status code: ' + response.statusCode));
          }
      })
  })
}
//Update entity values
const setEntityValues =(context,reset) =>{

   Object.keys(context.entities).forEach(function(key){
        //var tempKey = key.replace(/_/g,'-');
        context.context[key] = context.entities[key][0].value;
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
//Preapare facebook list template
const prepareListTemplate = (hits)=>{
  var elementItem ={
                    "title": "",
                    "image_url": "",
                    "subtitle": "",
                    "default_action": {
                        "type": "web_url",
                        "url": "",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": ""
                    },
                    "buttons": [
                        {
                            "title": "",
                            "type": "web_url",
                            "url": "",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": ""
                        }
                    ]
                };

  var listTemplate = {
      "attachment": {
        "type": "template",
        "payload": {
            "template_type": "list",
            "top_element_style": "compact",
            "elements": []
        }
      }
  }

  hits.forEach(function(item){
      var productHit = item ;
      var elementItem ={
                    "title": "",
                    "image_url": "",
                    "subtitle": "",
                    "default_action": {
                        "type": "web_url",
                        "url": "",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": ""
                    },
                    "buttons": [
                        {
                            "title": "Add to Cart",
                            "type": "web_url",
                            "url": "https://google.com",
                            "messenger_extensions": true,
                            "webview_height_ratio": "tall",
                            "fallback_url": ""
                        }
                    ]
                };
      elementItem.title = productHit.product_name;
      elementItem.subtitle = productHit.image.title;
      elementItem.image_url = productHit.image.link.replace(/\/large\//g,'/small/');
      elementItem.default_action.url = productHit.link;
      listTemplate.attachment.payload.elements.push(elementItem);
  });
  return listTemplate;
}

const client = new Wit({accessToken, actions});
interactive(client);