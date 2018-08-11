const
	fs = require( "fs" ),
	aws = require( "aws-sdk" ),
	localImagesPath = "../wanamic-frontend/src/images/";

let s3 = new aws.S3({
	accessKeyId: process.env.ACCESS_KEY_ID,
	secretAccessKey: process.env.SECRET_ACCESS_KEY,
	Bucket: "wanamic"
});

removeImage = ( fileName ) => {
	if ( !fileName ) {
		throw new Error( "Filename undefined." );
	}
	try {
		if ( process.env.NODE_ENV === "dev" ) {
			fs.unlink( localImagesPath + fileName, err => {
				if ( err ) {
					throw err;
				}
			});
		} else {
			s3.deleteObject({ Bucket: "wanamic", Key: fileName }, err => {
				if ( err ) {
					throw err;
				}
			});
		}
		return true;
	} catch ( err ) {
		throw err;
	}
};

module.exports = removeImage;
