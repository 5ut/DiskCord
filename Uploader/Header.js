const config = require("./Config");

class Header{
    #urlPrefix = "";
    #chunks = {};
    #chunksCount = 0;
    #files = [];
    #filesCount = 0;

    constructor(urlPrefix){
        this.#urlPrefix = urlPrefix;
    }

    //Adds the filenames with their start/end bytes.
    // [start, end)
    addFile(filename, start, end){
        this.#filesCount++;
        this.#files.push({
            name: filename,
            start: start,
            end: end
        });
    }

    addChunk(fileName, fileSize, encrypted){
        this.#chunksCount++;
        this.#chunks[this.#chunksCount] = {
            name: fileName,
            size: fileSize,
            encrypted: encrypted,
            url: ""
        };
        return this.#chunksCount;
    }

    setUrlOfFile(id, url){
        if(id < 1 || id > this.#chunksCount){
            throw Error("Invalid file ID to set URL.");
        }

        this.#chunks[id].url = url;
    }

    toJSON(){
        var retObj = {
            urlPrefix: this.#urlPrefix,
            docAliasVar: config.DOCUMENT_VAR_ALIAS,
            dataChunksVar: config.DATA_CHUNKS_VARIABLE,
            chunks: this.#chunks,
            files: this.#files,
        };

        return JSON.stringify(retObj);
    }
    
}

module.exports.Header = Header;