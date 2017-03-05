const FB = require('../lib/fbutil');
const request = require('request');
const client_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const siteHost ='https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net';
const siteSuffix = '/s/SiteGenesis/dw/shop/v17_2/product_search';
const entireURL = siteHost + siteSuffix;
// all categorie ids
const cats = ["womens_clothing","mens-clothing","womens_accessories","mens-accessories","electronics","jewelry"];
var options = {
    qs : null
};
var queryString ={
    "refine_1" : "",
    "expand" : "images",
    "count" : 10,
    "start" : 0,
    "sort" : "title",
    "q": "",
    "client_id" : client_id 
};
/**
 * Search product on demand ware open api
 * https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net/s/SiteGenesis/dw/shop/v17_2/product_search?q=&refine_1=cgid=electronics-televisions-flat-screen&client_id=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&expand=images&count=10&sort=title&start=22
 * @param {*} context
 * @param {*} reset
 */
const searchProductOnDemandWare = function (context){
  queryString.q = context['search_query']!="undefined" ? context['search_query'] : '' ;
  queryString.refine_1 = 'cgid=' + extractCategory(context);
  options.qs =  queryString;
  console.log('options',JSON.stringify(options));
  console.log('URL',entireURL);  
  return new Promise(function(resolve,reject){
      request(entireURL,options,
      function(error,response,body){
          if(!error  && response.statusCode == 200){
            var bodyItem = JSON.parse(body);
            var template = '';
            if(typeof(bodyItem.hits)!="undefined"){
               template = FB.prepareListTemplate(bodyItem.hits);
            }else{
              template = 'Product not found!';
            }
            console.log(template);
            resolve(template);
          }else{
            reject(new Error('Failed to load page, status code: ' + response.statusCode));
          }
      })
  })
}

const extractCategory= function (context){
    //Loop through the key
    debugger;
    console.log('extrac category',context);
    Object.keys(cats).forEach(function(k){
        var key = cats[k];
        if(context.hasOwnProperty(key)){
            console.log('key',key);
            var tempKey = key.toLowerCase();
            tempKey = tempKey.replace(/_/g,'-');
            console.log('reeturn' , tempKey + '-' +context[key]);
            return  tempKey + '-' +context[key];
        }
    });
}
module.exports = { searchProductOnDemandWare };