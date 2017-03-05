let temps = require('./lib/fbtemps');
const request = require('request');
const siteHost ='https://osfglobalservices26-alliance-prtnr-eu03-dw.demandware.net';
const siteSuffix = '/s/SiteGenesis/dw/shop/v17_2/product_search';
const client_id='aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
var q = 'dress';//contextMap['search-query']!="undefined" ? contextMap['search-query'] : '' ;
var refine_1 = 'cgid=';
var expand ='images';
var count = 10;
var start = 0;
var sort = 'title';
console.log('Message Template : ',temps.message);
var options ={
        client_id : client_id,
        refine_1 : refine_1,
        q : q,
        expand : expand,
        count : count,
        start : start,
        sort : sort
};
const search_product = ( queries ) => {
    return new Promise((resolve, reject) => {
        request({
            method : "GET",
            uri : siteHost + siteSuffix,
            qs : queries
        },function(err,req,body){
            if(err){
                reject(err);
            }else{
                var res = JSON.parse(body);
                var image_url = res.hits[0].image.link;
                var middle_url = image_url.replace(/\/large\//g,'/medium/');
                console.log("Middle image url = %s" , middle_url);
                resolve(res);
            }
        });
    });
}

const search_product_cb = (res) =>{
    console.log("HIT ========= >",res.hits[0]);
}

search_product( options )
    .then(search_product_cb)
    .catch(function(err){
        console.error("An error occureddd %O",err);
    });

