const Config = require("./Config");
const Generator = require("./Generator");

const Discord = require('discord.js');
const bot = new Discord.Client();

async function uploader(fileName){
	try{
		console.log("Parsing file...");

		let fileGenInfo = await Generator.writeChunks(fileName, Config.DISCORD_URL_PREFIX, Config.DISCORD_FILE_MAX);
		
		console.log("Parsed and generated files.");

		bot.on('ready', async function(){

			console.log("Logged in.");

			channel = await bot.channels.fetch(Config.DISCORD_CHANNELID);
			
			if(channel == undefined){
				throw Error("Unable to find upload channel.");
			}
			
			//Start uploading chunks
			let count = 1;
			while(count in fileGenInfo){
				let uploadData = await channel.send({
					files: [{
						attachment: fileGenInfo[count].url,
						name: fileGenInfo[count].name
					}]
				}).catch(function (err) {
					throw Error("Upload error - " + err.message);
				});

				console.log("Uploaded: " + fileGenInfo[count].name);

				//Update header with URL
				let uploadedURL = uploadData.attachments.values().next().value.url;
				uploadedURL = uploadedURL.replace(Config.DISCORD_URL_PREFIX, "");

				Generator.setURL(fileGenInfo[count].id, uploadedURL);

				count ++;
			}

			//Write header
			let headerURL = await Generator.writeHeader();

			//Upload header and get URL
			let uploadHeaderData = await channel.send({
				files: [{
					attachment: headerURL,
					name: fileGenInfo.header
				}]
			}).catch(function (err) {
				throw Error("Upload error - " + err.message);
			});

			console.log("Fully uploaded. Use this url on your website.");
			console.log(uploadHeaderData.attachments.values().next().value.url);

			bot.destroy();
		});

		console.log("Logging in...");

		bot.login(Config.DISCORD_TOKEN);
	}
	catch(err){
		bot.destroy();
		console.log(err);
		throw Error("Discord: " + err.name +  " - " + err.message);
	}
}

module.exports.upload = uploader;