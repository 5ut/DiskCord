function DiskCord(){
    var _header = null;
    var _varAlias = "HD";
    var _numChunks = 0;
    var _totalSize = 0;

    var _currentDownloadProg = 0;

    /////////////////////////////////////////////////////////////////////////////////////////////////////
    // Public 

    this.open = async function(url){
        if(url.length <= 0){
            return false;
        }

        //Get header, parse it.
        return setHeader(url);
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
    var byteToChunkOffset = function(byte, chunk){
        for(var i=1;i<_totalSize;i++){
            byte -= _header.chunks[i].origSize;

            if(byte <= 0){
                byte += _header.chunks[i].origSize;
                return byte;
            }
        }

        return 0;
    }

    //Returns the chunk that will contain that byte
    var byteToChunk = function(bytePos){
        let curSize = 0;
        for(var i=1;i<_totalSize;i++){
            curSize += _header.chunks[i].origSize;

            if(curSize >= bytePos){
                return i;
            }
        }

        return -1;
    }

    //Downloads and sets the header
    var setHeader = async function(url){
        try{
            var data = await download(url);

            _header = JSON.parse(new TextDecoder().decode(data));

            _varAlias = _header.dataChunksVar;

            //Count chunks
            let count = 1;
            while(count in _header.chunks){
                _totalSize += _header.chunks[count].origSize;
                count++;
            }
            count--;

            _numChunks = count;

        }catch(err){
            console.log(err);
            console.log("Failed to parse JSON for header. Invalid header?");
        }
    }

    var download = function(url){
        //TODO: Handle decompression

        //Clear previous script
        var script = document.querySelector("#fileLoader");
        if(script){
            script.remove();
        }
        
        //Initalize and reset document variables
        document[_varAlias] = "";
    
        return new Promise(function(resolve, reject){
            var script = document.createElement('script');
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