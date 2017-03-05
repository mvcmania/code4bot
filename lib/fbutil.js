const request = require('request');

// Wit.ai parameters
const WIT_TOKEN = process.env.WIT_TOKEN || "WZWA3TCASGIBZINFXKYNQKEN4BNMNCEN";

//Wit api url 
const WIT_API_URL = 'https://api.wit.ai';

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
        headers : {
                    'Authorization': 'Bearer '+WIT_TOKEN
                  }
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
//    getInitialIntents : getInitialEntities('intent')
 module.exports = {
    initalIntents : getInitialEntities
 };
