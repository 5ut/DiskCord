const Discord = require("./Discord");

try{
    console.log("Starting...");

    Discord.upload("./Build/Input/");

    console.log("Success.");
}
catch(err){
    console.log(err.message);
    console.log(err);
}