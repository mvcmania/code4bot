let button = {
    title : "Chekout",
    type : "web_url",
    url: "",
    messenger_extensions: true,
    webview_height_ratio: "tall",
    fallback_url : ""
};

let default_action = {
    type : "web_url",
    url : "",
    messenger_extensions: true,
    webview_height_ratio: "tall",
    fallback_url : "" 
};

let element = {
     title: "",
     image_url : "",
     subtitle : "",
     default_action : default_action,
     buttons: [ button ]     
};

let elements = [ element ];

let payload = { 
    template_type : "list",
    top_element_style : "compact",
    elements : elements
};

let attachment = {
     type : "template",
     payload : payload
}

let message = {
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


