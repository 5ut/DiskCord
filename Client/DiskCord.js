function DiskCord(){
    const decryptionVerifyMsg = "DiskCord";

    var _header = null;
    var _varAlias = "HD";
    var _numChunks = 0;
    var _totalSize = 0;
    var _key = new Uint8Array(0);

    var _validDecrypt = false;

    var _currentDownloadProg = 0;

    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // Public 

    this.open = async function(url, encPass = ""){
        if(url.length <= 0){
            return false;
        }

        //Cannot use encryption/decryption in non-https environments 
        if("subtle" in crypto){
            const rawKey = await crypto.subtle.digest("SHA-256", (new TextEncoder()).encode(encPass));

            _key = await window.crypto.subtle.importKey(
                "raw",
                rawKey,
                "AES-CTR",
                true,
                ["decrypt"]
            );
        }
        

        //Get header, parse it.
        try{
            await setHeader(url);
        }catch(err){
            console.log(err);
        }
    }

    //Is the decryption successful?
    this.decryptSuccess = function(){
        return _validDecrypt;
    }

    //Returns the requested file as a buffer. Sync
    this.getFileSync = async function(name, start = -1, end = -1){
        //TODO: Cache data

        //Get info
        var fileInfo = getFileInfo(name);

        if(fileInfo == null){
            throw Error("No file found");
        }

        //Calc file size
        var fileSize = fileInfo.end - fileInfo.start;

        //Check if start/end is beyond file range
        if(start != -1 && end != -1){
            if(end < start || start > fileSize || end > fileSize){
                throw Error("Invalid file range");
            }
        }else{
            start = 0;end = fileSize;
        }

        //Figure start/end positions
        let startFile = fileInfo.start + start;
        let endFile = fileInfo.start + end;

        let data = await getData(startFile, endFile);

        return data;
    }

    //Returns the requested file as a buffer. Async
    this.getFile = async function(name, cb, start = -1, end = -1){
        //TODO: Cache data
        if(typeof(cb) !== typeof(Function)){
            return;
        }

        try{
            var data = await this.getFileSync(name, start, end);
            cb(false, data);

        }catch(err){
            cb(err.message, null);
        }
    }

    //Loads the bytes into a blob. Sync
    this.getFileURLSync = async function(name, type, start = -1, end = -1){
        //TODO: Cache URL
        //TODO: Will store data twice at certain points. Figure out a stream or better solution
        let data;
        try{
            data = await this.getFileSync(name, start, end);
        }catch(err){
            throw(err.message);
        }

        var blob = new Blob([data.buffer], { type: type });
        return URL.createObjectURL(blob);
    }

    //Loads the bytes into a blob. Aync
    this.getFileURL = async function(name, type, cb, start = -1, end = -1){
        //TODO: Cache URL
        if(typeof(cb) !== typeof(Function)){
            return;
        }

        let url;
        try{
            url = await this.getFileURLSync(name, type, start, end);
        }catch(err){
            cb(err.message, null);
        }

        cb(false, url);
    }

    //Returns a list of file names and size
    this.getFileList = function(){
        var retVal = [];
        _header.files.forEach(file => {
            retVal.push({
                name:file.name,
                size:file.end - file.start
            });
        });
        return retVal;
    }

    //Returns the downloaded progress (as percent)
    this.getProgress = function(){
        return _currentDownloadProg;//read only
    }

    //Converts common names to MIME types
    this.getBlobType = function(){
        //TODO:Implement

        //eg: getURL(getBlobType("MP3"), 0, 10)
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // Private 

    //Downloads the bytes in a buffer (sync)
    var getData = async function(start = -1, end = -1){
        if(start == -1 && end == -1){
            start = 0;end=_totalSize;
        }

        //Calculate the starting chunk
        let startChunk = byteToChunk(start);
        let endChunk = byteToChunk(end);

        //Download data
        var dataBuff = new Uint8Array(end - start);

        _currentDownloadProg = 0;//Set download percent
        var curOffset = 0;
        for(var i=startChunk;i<=endChunk;i++){
            var data = await download(_header.urlPrefix + _header.chunks[i].url);

            //Decrypt data
            if(_header.chunks[i].encrypted){
                data = await crypto.subtle.decrypt({
                    name: "AES-CTR",
                    counter: new Uint8Array(16),
                    length: 64
                }, _key, data.buffer);

                data = new Uint8Array(data);//For subarray
            }

            _currentDownloadProg = (i/endChunk).toFixed(2)*100;//Set download percent

            if(startChunk == endChunk){
                data = data.subarray(byteToChunkOffset(start), byteToChunkOffset(end));
            }else if(i==startChunk){
                data = data.subarray(byteToChunkOffset(start));
            }else if(i==endChunk){
                data = data.subarray(0, byteToChunkOffset(end));
            }

            dataBuff.set(data, curOffset);

            curOffset += data.length;
        }

        _currentDownloadProg = 100;//Set download percent

        return dataBuff;
    }

    //Returns the file info. If no data found, return null.
    var getFileInfo = function(name){
        var retVal = null;
        _header.files.forEach(file => {
            if(file.name == name){
                retVal = file;
                return;
            }
        });
        return retVal;
    }

    //Returns the offset inside the chunk to reach that byte
    var byteToChunkOffset = function(byte){
        for(var i=1;i<_totalSize;i++){
            byte -= _header.chunks[i].size;

            if(byte <= 0){
                byte += _header.chunks[i].size;
                return byte;
            }
        }

        return 0;
    }

    //Returns the chunk that will contain that byte
    var byteToChunk = function(bytePos){
        let curSize = 0;
        for(var i=1;i<_totalSize;i++){
            curSize += _header.chunks[i].size;

            if(curSize >= bytePos){
                return i;
            }
        }

        return -1;
    }

    //Downloads and sets the header
    var setHeader = async function(url){
        var data = await download(url);
        var dataOrig = data;

        //Decrypt header, and verify
        if(document[_varAlias + "_ENC"]){ 
            //This is set to false if not encrypted, or not set if using an old header.
            //Therefore it wont attempt to decrypt if not encrypted

            //Check if encryption is available
            if(!("subtle" in crypto)){
                throw new Error("Decryption is not available in this browser");
            }

            //Attempt to decrypt the verification message first
            let encryptVerifMsg = Uint8Array.from(atob(document[_varAlias + "_ENC"]), c => c.charCodeAt(0));
            let decryptVerifMsg = await crypto.subtle.decrypt({
                name: "AES-CTR",
                counter: new Uint8Array(16),
                length: 64
            }, _key, encryptVerifMsg.buffer);

            var verifMsg = (new TextDecoder()).decode(new Uint8Array(decryptVerifMsg));

            try{
                verifMsg = JSON.parse(verifMsg);

                if(!("msg" in verifMsg) || verifMsg.msg != decryptionVerifyMsg){
                    throw new Error("Invalid Password");
                }
            }catch(err){
                return;//We don't throw error if it doesn't parse, since it is not an error. Just in invalid password.
            }

            //Decrypt data
            if(verifMsg.headerEnc){
                data = await crypto.subtle.decrypt({
                    name: "AES-CTR",
                    counter: new Uint8Array(16),
                    length: 64
                }, _key, data.buffer);
            }

            document[_varAlias + "_ENC"] = null;
        }

        _validDecrypt = true; // If decryption is disabled, it'll still say its valid

        _header = JSON.parse(new TextDecoder().decode(data));

        _varAlias = _header.dataChunksVar;

        //Count chunks
        let count = 1;
        while(count in _header.chunks){
            _totalSize += _header.chunks[count].size;
            count++;
        }
        count--;

        _numChunks = count;
    }

    var download = function(url){
        //Clear previous script
        var script = document.querySelector("#fileLoader");
        if(script){
            script.remove();
        }
        
        //Initalize and reset document variables
        document[_varAlias] = "";
    
        return new Promise(function(resolve, reject){
            var script = document.createElement("script");
            script.onload = function(){
                var data = Uint8Array.from(atob(document[_varAlias]), c => c.charCodeAt(0));
                document[_varAlias] = "";
                
                script.remove();

                resolve(data);
            };
            script.src = url;
            script.id = "fileLoader";
            document.getElementsByTagName("head")[0].appendChild(script);
        });
    }
}