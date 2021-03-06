const request = require('request');
const crypto = require('crypto');
const fetch = require('node-fetch');
const {
  CLIENT_ID,
  SITE_HOST,
  SITE_SUFFIX,
  PRODUCT_SEARCH_PATH,
  CUSTOM_OBJECT_PATH,
  JWT_TOKEN_PATH,
  BASKET_PATH,
  ADD_ITEM_PATH,
  VIEW_CART_PATH
} = require('../lib/config');
// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN || "WZWA3TCASGIBZINFXKYNQKEN4BNMNCEN";

//Wit api url 
const WIT_API_URL = 'https://api.wit.ai';
// Messenger API parameters
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN || 'EAAc3llzpsX4BAEkQ8wjk9q6DZABuGCPFZBUMRVnMx3ZBrJA5TgsY36dMs2qtqRdUxO3ostzRnCZB7sLX9ILWac5toebxmUb7ERLzLZAiXsDr0oo6LxPzgrQnOgg3E01I59ySfudE3a5TdZCc3hQ2QiD575CDrQSdS0ZCQpxZAO0lwgZDZD';
if (!FB_PAGE_TOKEN) { throw new Error('missing FB_PAGE_TOKEN') }

const FB_APP_SECRET = process.env.FB_APP_SECRET || 'abf0901c71065d5030861e6c09f6a634';
if (!FB_APP_SECRET) { throw new Error('missing FB_APP_SECRET') }

//Get the date with leading zero 
//eg. 03012017
const getLeadingZeroDate = () => {
  var dateObj = new Date();
  var month = dateObj.getUTCMonth() + 1; //months from 1-12
  var day = dateObj.getUTCDate();
  var year = dateObj.getUTCFullYear();
  return year + (month < 10 ? '0' + month : month ) + (day < 10 ? '0' +day : day);
}

//----------------------------------------------------------------------
//To be able to fetch entity metadata info
// See the Wit.ai API reference 
//https://wit.ai/docs/http/20160526#get--entities-:entity-id-link
const getEntityMetadata = (entityId,callback) =>{
  if(entityId){
    var apiUrl = WIT_API_URL + '/entities/' + entityId;
    var qs = 'v='+getLeadingZeroDate();   
    var options = {
        url     : apiUrl + '?'+ qs,
        headers : {  'Authorization': 'Bearer '+WIT_TOKEN  }
    };
    request(options,callback); 
  }else{
    return {};
  } 
};

const getInitialEntities = (entityId) => {
    return new Promise((resolve, reject) => {
        getEntityMetadata(entityId,(err,res,body)=>{
            if(err){
                reject(err);
            }else{
                var result = JSON.parse(body);
                var intents = [];
                result.values.forEach( (item) => intents.push(item.value) );
                resolve(intents);
            }
        });
    });
};
// ----------------------------------------------------------------------------
// Messenger API specific code

// See the Send API reference
// https://developers.facebook.com/docs/messenger-platform/send-api-reference

const fbMessage = (id, text) => {
  const body = JSON.stringify({
    recipient: { id },
    message: (typeof(text)=='object' ? text : { text }),
  });
  console.log('FB Message Body');
  console.log(body);
  const qs = 'access_token=' + encodeURIComponent(FB_PAGE_TOKEN);
  return fetch('https://graph.facebook.com/me/messages?' + qs, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body,
  })
  .then(rsp => rsp.json())
  .then(json => {
    if (json.error && json.error.message) {
      throw new Error(json.error.message);
    }
    return json;
  });
};

/*
 * Verify that the callback came from Facebook. Using the App Secret from
 * the App Dashboard, we can verify the signature that is sent with each
 * callback in the x-hub-signature field, located in the header.
 *
 * https://developers.facebook.com/docs/graph-api/webhooks#setup
 *
 */
function verifyRequestSignature(req, res, buf) {
  var signature = req.headers["x-hub-signature"];

  if (!signature) {
    // For testing, let's log an error. In production, you should throw an
    // error.
    console.error("Couldn't validate the signature.");
  } else {
    var elements = signature.split('=');
    var method = elements[0];
    var signatureHash = elements[1];

    var expectedHash = crypto.createHmac('sha1', FB_APP_SECRET)
                        .update(buf)
                        .digest('hex');

    if (signatureHash != expectedHash) {
      throw new Error("Couldn't validate the request signature.");
    }
  }
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
  var listTemplate = {
      "attachment": {
        "type": "template",
        "payload": {
            "template_type": "generic",
            "elements": []
        }
      }
  }

  hits.forEach(function(item){
      var productHit = item ;
      var entireURL =  SITE_HOST + SITE_SUFFIX ;
      var elementItem ={
                    "title": "",
                    "image_url": "",
                    "subtitle": "",
                    "default_action": {
                        "type": "web_url",
                        "url": "",
                        "messenger_extensions": true,
                        "webview_height_ratio": "tall",
                        "fallback_url": entireURL
                    },
                    "buttons": [
                       {
                            "title": "Add To Cart",
                            "type": "postback",
                            "payload": "",                    
                        }
                    ]
                };
      elementItem.title = productHit.product_name;
      elementItem.subtitle = productHit.image.title;
      elementItem.image_url = productHit.image.link;//.replace(/\/large\//g,'/medium/');
      elementItem.default_action.url = productHit.link;
      elementItem.subtitle += '\nPrice : '+parseFloat(productHit.price)+' $';
      elementItem.buttons[0].payload ="{'action' : 'ADDTOCART','product_id':'"+productHit.product_id+"','quantity' :1}";
      listTemplate.attachment.payload.elements.push(elementItem);
      //Categorize template type
     /* if(hits.length ==1 ){
          listTemplate.attachment.payload.template_type = 'generic';
          delete listTemplate.attachment.payload.top_element_style;
      }*/
  });
  return listTemplate;
}

const prepareViewBasket = ()=>{
    var entireURL =  SITE_HOST  + VIEW_CART_PATH;
    var buttonTemplate = {
      "attachment": {
        "type": "template",
        "payload": {
            "template_type": "button",
            "text" : "Visit your basket!",
            "buttons":[
                {
                  "type":"web_url",
                  "url":entireURL,
                  "title":"Show Cart"
                },
            ]
        }
      }
  }
  return buttonTemplate;
}
//    getInitialIntents : getInitialEntities('intent')
 module.exports = {
    initalIntents : getInitialEntities,
    fbMessage : fbMessage,
    verifyRequestSignature : verifyRequestSignature,
    prepareListTemplate : prepareListTemplate,
    prepareViewBasket :prepareViewBasket,
    setQuickReplies : setQuickReplies
 };
