const FB = require('../lib/fbutil');
const request = require('request');

const {
  CLIENT_ID,
  SITE_HOST,
  SITE_SUFFIX,
  PRODUCT_SEARCH_PATH,
  CUSTOM_OBJECT_PATH,
  JWT_TOKEN_PATH,
  BASKET_PATH,
  ADD_ITEM_PATH
} = require('../lib/config');
const entireURL = SITE_HOST + SITE_SUFFIX;
var jwtToken = '';
// all categorie ids
const cats = ["womens_clothing","mens-clothing","womens_accessories","mens-accessories","electronics","jewelry"];
var options = {
    qs : null
};
var queryString ={
    "refine_1" : "",
    "expand" : "images,prices",
    "count" : 4,
    "start" : 0,
    "sort" : "title",
    "q": "",
    "client_id" : CLIENT_ID
};
/**
 * Search product on demand ware open api
 * https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net/s/SiteGenesis/dw/shop/v17_2/product_search?q=&refine_1=cgid=electronics-televisions-flat-screen&client_id=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa&expand=images&count=10&sort=title&start=22
 * @param {*} context
 * @param {*} reset
 */
const searchProductOnDemandWare = function (context){
  queryString.q = context['refinements']!="undefined" ? context['refinements'] : '' ;
  queryString.refine_1 = 'cgid=' + extractCategory(context);
  options.qs =  queryString;

  var refine2 = extractPrice(context);
  console.log('refine 2',refine2);
  if(typeof(refine2)!="undefined"){
    options.qs.refine_2 = 'price='+refine2;
  }

  console.log('options',JSON.stringify(options));

  console.log('URL',entireURL);  
  return new Promise(function(resolve,reject){
      request(entireURL + PRODUCT_SEARCH_PATH,options,
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
            reject(new Error('Failed to search product, status code: ' + response.statusCode));
          }
      })
  })
}

const retrieveCustomObjectValue = function(customobjectid,keyId){
  
  var tempOptions = { qs : {'client_id' : CLIENT_ID}};
  return new Promise(function(resolve,reject){
      request(entireURL + CUSTOM_OBJECT_PATH +'/'+ customobjectid +'/'+keyId ,tempOptions,
      function(error,response,body){
          if(!error  && response.statusCode == 200){
                var bodyItem = JSON.parse(body);
                resolve(bodyItem);
          }else{
             reject(new Error('Failed to retrieve custom object settings, status code: ' + response.statusCode));
          }
      })
  })
}

const requestAuthTokenAsGuest = function(){

}
/**
 * prepare category id for product search like womens-clothing-dresses
 * @param {*wit.ai context} context 
 */
const extractCategory= function (context){
    //Loop through the key
    console.log('extrac category',context);
    var categoryid ='';
    Object.keys(cats).forEach(function(k){
        var key = cats[k];
        if(context.hasOwnProperty(key)){
            console.log('key',key);
            var tempKey = key.toLowerCase();
            tempKey = tempKey.replace(/_/g,'-');
            categoryid  = tempKey + '-' +context[key];
        }
    });
    return categoryid;
}
const extractPrice =  function (context){
    //Loop through the key
    debugger;
    console.log('extrac price',context);
    var priceRefinement;
    if(context.hasOwnProperty('from') && context.hasOwnProperty('to')){
        priceRefinement = '('+context.from+'..'+context.to+')';
    }

    return priceRefinement;
}

//Update entity values
const setEntityValues =(context,reset) =>{
   
   if(reset)
   context.context = {};

   Object.keys(context.entities).forEach(function(key){
        context.context[key] = context.entities[key][0].value;
        console.log('key is='+key);
    });
    
    //set no query if search_query is not existing,
    if(!context.context.hasOwnProperty('refinements')){
        context.context["no_query"] =  true;
    }else if(context.context.no_query){
        delete context.context.no_query;  
    }
    //price detection 
    if(!context.context.hasOwnProperty('from') || !context.context.hasOwnProperty('to')){
        context.context.missingPrice = true;
    }else{
        delete context.context.missingPrice;
    }

    //tv detection 
    if(context.context.hasOwnProperty('electronics') ){
        if(context.context.electronics=='televisions'){
                context.context.tv = true;
        }else{
                delete context.context.tv;
        }
        //tv detection 
        if(context.context.electronics=='gaming'){
            context.context.gaming = true;
        }else{
            delete context.context.gaming;
        }
        //Gaming
        if(context.context.electronics=='digital_cameras'){
            context.context.digital_cameras = true;
        }else{
            delete context.context.digital_cameras;
        }
    }
     //noIntent
    if(!context.context.hasOwnProperty('intent')){
        context.context.noIntent = true;
    }else{
        delete context.context.noIntent;
    }

}
//Update entity values
const getJWTToken =(cb) =>{
    var optionsParam ={
        uri : entireURL + JWT_TOKEN_PATH,
        headers :{
            'Content-Type':'application/json',
            'Origin': entireURL
        },
        body : {"type":"guest"},
        method :'POST',
        json:true,
        qs :{
            'client_id' : CLIENT_ID
        }
    };
   request(optionsParam,cb);
}
//Create a basket 
const createBasket = () =>{
    var optionsParam = {
        uri : entireURL + BASKET_PATH,
        headers : {
            'Authorization' : process.env.JWT_TOKEN,
            'Origin' : entireURL
        },
        qs :{
            'client_id' : CLIENT_ID
        },
        json:true,
        method:'POST'
    }
    return new Promise(function(resolve,reject){
        request(optionsParam,function(error,response,body){
            if(!error  && response.statusCode ==200){
                console.log(typeof(body));
                console.log(body);
                resolve(body);
            }else{
                reject(new Error('Error adding item to basket ',body));
            }
        });
    });
}

//Addd items to basket 
const addToBasket = (productid,quantity) => {
    var optionsParam = {
        uri : entireURL + BASKET_PATH +'/'+process.env.BASKET_ID + ADD_ITEM_PATH,
        headers : {
            'Authorization' : process.env.JWT_TOKEN,
            'Origin' : entireURL,
            'Content-Type' : 'application/json'
        },
        qs :{
            'client_id' : CLIENT_ID
        },
        method:'POST',
        body : [
                {
                    "product_id" : productid,
                    "quantity" : quantity ? quantity : 1
                }
              ],
        json:true
    }
    return new Promise(function(resolve,reject){
        request(optionsParam,function(error,response,body){
            if(!error  && response.statusCode ==200){
                resolve(body);
            }else{
                reject(new Error('Error adding item to basket ',body));
            }
        });
    });
    
}
module.exports = { searchProductOnDemandWare,retrieveCustomObjectValue,setEntityValues,getJWTToken,createBasket,addToBasket  };