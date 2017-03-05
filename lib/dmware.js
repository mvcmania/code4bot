const request = require('request');
const siteHost ='https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net';
const siteSuffix = '/s/SiteGenesis/dw/shop/v17_2/product_search';
var temps = require('../lib/fbtemps');



/**
 * Search product on demand ware open api
 * https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net/s/SiteGenesis/dw/shop/v17_2/product_search?q=&refine_1=cgid=electronics-televisions-flat-screen&client_id=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&expand=images&count=10&sort=title&start=22
 * @param {*} context 
 * @param {*} reset 
 */
var searchProductOnDemandWare=(params)=> {
  var entireURL = siteHost + siteSuffix;
//   var productSearchDirectory = '/product_search';
//   var q = contextMap['search-query']!="undefined" ? contextMap['search-query'] : '' ;
//   var refine_1 = 'cgid=' + extractCategory();
//   var expand ='images';
//   var count = 10;
//   var start = 0; 
//   var sort = 'title';
  
//   entireURL = (entireURL+'?client_id=' + client_id + '&refine_1=' + refine_1 + '&q='+ q + '&expand=' + expand + '&count=' + count + '&start=' + start + '&sort=' + sort);
//   console.log(entireURL);
  return new Promise(function(resolve,reject){
      request({
        method : "GET",
        uri : siteHost + siteSuffix,
        qs : params
      },
      function(error,response,body){
         console.log('error',error);
         console.log('response.statusCode',response.statusCode);
         console.log('body',body);
          if(!error  && response.statusCode == 200){
            var bodyItem = JSON.parse(body);
            var template = null;
            if(typeof(bodyItem.hits)!="undefined"){
              template = prepareListTemplate(bodyItem.hits);
            }else{
              template = 'Product not found!';
            }
            resolve(template);
          }else{
            reject(new Error('Failed to load page, status code: ' + response.statusCode));
          }
      });
  });
}
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
                            "url": "https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net",
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
};
module.exports = { 
    searchProducts : searchProductOnDemandWare
}
