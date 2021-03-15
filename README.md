![DiskCord logo.](https://media.discordapp.net/attachments/447707767000662017/821084108033491064/hard-drive-disk-icon2.png "DiskCord logo.")
# DiskCord
 Upload files of any size on external sites as smaller arbitrarily sized chunks, and access the files reassembled in the browser without any CORS restriction.
 
## Examples
 https://5ut.github.io/
 
## What it can be used for
 * Hosting files on external sites without restrictions and view them as:
    * Streamed or BLOB video
    * Raw downloads (Stream or BLOB)
    * Large images
    * Live streamed data
 * Backup Data
 * Sharing files

## Features

 * Bypass CORS restrictions
 * Multiple file hosting from single reference
 * Modular - Write your own uploading module for your favorite site
 * Fully streamed uploading, no memory issues for large files
 * **Soon:** Compression & Encryption
 * **Soon:** Live stream of data
 
## How it works
 The uploader will convert all your input files into a single giant "blob" file. This file will be parsed into multiple uploadable (of specified size) chunks to be uploaded to your server of choice. These chunks are specially encrypted, compressed, and encoded to ensure clean delivery to the browser when requested. A header containing information about the chunks, and their locations is also uploaded and a URL of the header is returned to the uploader.
 
 Once these chunks/header are uploaded, you can implement the client side script on your website and specify the header URL. Once a user enters your site they will download the header and anytime your script requests a file with DiskCord it will download the chunks that contain the data inside that file and then reconnects it all back together to use the file. 