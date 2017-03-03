const button = {
    title : "Chekout",
    type : "web_url",
    url: "",
    messenger_extensions: true,
    webview_height_ratio: "tall",
    fallback_url : ""
};

const default_action = {
    type : "web_url",
    url : "",
    messenger_extensions: true,
    webview_height_ratio: "tall",
    fallback_url : "" 
};

const element = {
     title: "",
     image_url : "",
     subtitle : "",
     default_action : default_action,
     buttons: [ button ]     
};

const elements = [ element ];

const payload = { 
    template_type : "list",
    top_element_style : "compact",
    elements : elements
};

const attachment = {
     type : "template",
     payload : payload
}

const message = {
    attachment : attachment
}

module.exports = {
   message : message,
   attachment : attachment,
   payload: payload,
   elements : elements,
   element : element,
   default_action : default_action,
   button : button
};


