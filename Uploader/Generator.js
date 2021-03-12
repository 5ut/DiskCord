var fs = require("fs-extra");
var brotli = require('brotli');
const header = require("./Header");

const Config = require("./Config");

/*
* Generates the chunks and header to be uploaded. Does not handle uploading.
*/

module.exports.writeChunks = writeChunks;
module.exports.setURL = setURL;
module.exports.writeHeader = writeHeader;

//Start header
var retHeader = null;

function writeChunks(fileInput, urlPrefix, maxChunkSize = 0, compressChunks = false){
    var retVal = {};

    //Do general checks
    if (!fs.existsSync(fileInput)){
		throw new Error("Invalid file name - " + fileInput);
	}

    if(maxChunkSize < 1){
        throw Error("Invalid chunk size.");
    }

    //Clean up
    if (fs.existsSync(Config.TMP_WORK_FOLDER)){
		fs.emptyDirSync(Config.TMP_WORK_FOLDER);
    }else{   
        fs.mkdirSync(Config.TMP_WORK_FOLDER);
    }

    if (fs.existsSync(Config.TMP_CHUNKS_FOLDER)){
		fs.emptyDirSync(Config.TMP_CHUNKS_FOLDER);
    }else{   
        fs.mkdirSync(Config.TMP_CHUNKS_FOLDER);
    }

    //Set header
    retHeader = new header.Header(urlPrefix);

    //Check if file or folder. If folder, blob together and write out file offsets to header.
    var fileStats = fs.statSync(fileInput);
    if(fileStats.isDirectory()){
        var fileList = createDirBlob(fileInput);

        //Add each file to header
        fileList.forEach(file => {
            retHeader.addFile(file.name, file.start, file.end);
        });

        //Change the input to the created blob
        fileInput = Config.TMP_BLOB_FILE;
    }else{
        retHeader.addFile(fileInput, 0, fileStats.size());
    }

    //Extract input as chunk, write out to file (JS formatted).
    var dataBuffer = new Uint8Array(maxChunkSize);

    var fileInputFD = fs.openSync(fileInput);

    let count = 0;
    var chunkOrigSize = 0;
    while((chunkOrigSize = fs.readSync(fileInputFD, dataBuffer, 0, dataBuffer.length, count * dataBuffer.length)) != 0){
        //Resize buffer
        let dataBufferTmp = new Uint8Array(chunkOrigSize);
        for(var i=0;i<dataBufferTmp.length;i++){
            dataBufferTmp[i] = dataBuffer[i];
        }
        dataBuffer = dataBufferTmp;
        
        count++;

        let fileName = Config.OUTPUT_PREFIX +Config.DATA_CHUNK_NAMES + count + Config.OUTPUT_SUFFIX;

        //Compress
        let compressSuccess = false;
        if(compressChunks){
            let compRes = brotli.compress(dataBuffer, {
                mode: 0,
                quality: 11,
                lgwin: 22
            });

            if(compRes != null){
                compressSuccess = true;
                dataBuffer = compRes;
            }
        }

        //Writes the data as a base64 string (for client to use)
        let fileString = Config.DOCUMENT_VAR_ALIAS + "." + Config.DATA_CHUNKS_VARIABLE + "=" + "\"" +
        Buffer.from(dataBuffer).toString("base64") + 
        "\";";

        //Write out chunk and add to references
        fs.writeFileSync(Config.TMP_CHUNKS_FOLDER + fileName, fileString);

        let id = retHeader.addChunk(fileName, dataBuffer.length, chunkOrigSize, compressSuccess);

        retVal[count] = {
            id: id,
            name: fileName,
            compressed: compressSuccess,
            url: Config.TMP_CHUNKS_FOLDER + fileName
        };

        //Reset for next chunk
        var dataBuffer = new Uint8Array(maxChunkSize);
    }

    retVal["header"] = Config.TMP_HEADER_FILENAME;

    return retVal;
}

//Compiles the input directory into a giant blob output to Config.TMP_BLOB_FILE
//Returns a list of filenames and their start/stop within that blob.
//Does not include folder/sub directories
var createDirBlob = function(dir){
    var retVal = [];

    var blobSize = 0;

    //Loop all files, append to Config.TMP_BLOB_FILE;
    fs.readdirSync(dir).forEach(file => {
        //Record file data
        var fileData = {
            name: file,
            start: blobSize,
            end: 0
        }

        //Write out file
        var dataBuffer = new Uint8Array(1024);

        var fileInputFD = fs.openSync(dir + file);

        var count = 0;
        var chunkSize = 0;
        while((chunkSize = fs.readSync(fileInputFD, dataBuffer, 0, dataBuffer.length, count * dataBuffer.length)) != 0){
            //Resize buffer
            let dataBufferTmp = new Uint8Array(chunkSize);
            for(var i=0;i<dataBufferTmp.length;i++){
                dataBufferTmp[i] = dataBuffer[i];
            }
            dataBuffer = dataBufferTmp;
            
            //Load into blob
            fs.appendFileSync(Config.TMP_BLOB_FILE, dataBufferTmp);
            
            blobSize += dataBufferTmp.length;

            count++;

            dataBuffer = new Uint8Array(1024);
        }

        //More data and add to returned value
        fileData.end = blobSize;

        retVal.push(fileData);
    });

    return retVal;
}

function setURL(fileID, url){
    if(retHeader == null){
        throw Error("Cannot write to header without initializing");
    }

    retHeader.setUrlOfFile(fileID, url);
}

function writeHeader(){
    if(retHeader == null){
        throw Error("Incomplete header. Cannot write.");
    }

    fs.writeFileSync(Config.TMP_HEADER_FILE, retHeader.toObject());
    return Config.TMP_HEADER_FILE
}