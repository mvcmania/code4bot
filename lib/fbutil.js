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
//    getInitialIntents : getInitialEntities('intent')
 module.exports = {
    initalIntents : getInitialEntities
 };
