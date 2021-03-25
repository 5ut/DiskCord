var config = {};

/*Folder Config*/
config["TMP_WORK_FOLDER"] = "./Build/Tmp/";
config["TMP_HEADER_FILENAME"] = "a.head";
config["TMP_HEADER_FILE"] = config["TMP_WORK_FOLDER"] + config["TMP_HEADER_FILENAME"];
config["TMP_CHUNKS_FOLDER"] = config["TMP_WORK_FOLDER"] + "chunks/";
config["TMP_BLOB_FILE"] = config["TMP_WORK_FOLDER"] + "chungus.blob";

/*Generated Files Config*/
config["HEADER_VAR_ALIAS"] = "document.HD";//Correlates to "_varAlias" inside the DiskCord.js client script (update client to match this)
config["DOCUMENT_VAR_ALIAS"] = "Z";// Global variable we rename "document" as. (save space)
config["DATA_CHUNKS_VARIABLE"] = "P";// Variable used on the client that we store the requested data into
config["OUTPUT_PREFIX"] = "";// Adds to filename before/after
config["OUTPUT_SUFFIX"] = ".js";//    ^^^
config["HEADER_FILE_NAME"] = "head";
config["DATA_CHUNK_NAMES"] = "";// Will always add 0,1,2..etc after.

/*Discord Params*/
config["DISCORD_TOKEN"] = "";
config["DISCORD_CHANNELID"] = "";
config["DISCORD_FILE_MAX"] = 1024 * 1024 * 2;
config["DISCORD_URL_PREFIX"] = "https://cdn.discordapp.com/attachments/" + config.DISCORD_CHANNELID + "/";

/*Encryption*/
config["ENCRYPTION_PASS"] = "password123"; // Ensure a strong passphrase
config["ENCRYPT_CHUNKS"] = true; // Encryption requires the client script to be hosted in https
config["ENCRYPT_HEADER"] = true; // ^^^^
config["DECRYPTION_VERIFICATION_MSG"] = "DiskCord"; // Must match "decryptionVerifyMsg" in the client

Object.freeze(config);

module.exports = config;