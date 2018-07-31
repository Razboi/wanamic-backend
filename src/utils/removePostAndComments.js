const
	User = require( "../models/User" ),
	Comment = require( "../models/Comment" ),
	fs = require( "fs" );

removePostAndComments = ( user, post ) => {

	return new Promise( async function( resolve, reject ) {
		if ( !user || !post ) {
			reject( "User or Post undefined." );
		}

		try {
			User.update(
				{ _id: { $in: [ user.friends, user.followers ] } },
				{ $pull: { "newsfeed": post._id } },
				{ multi: true }
			).exec();

			if ( post.picture ) {
				const
					picPath = "../wanamic-frontend/src/images/",
					picFile = post.mediaContent.image;
				await fs.unlink( picPath + picFile, err => {
					if ( err ) {
						reject( err );
					}
				});
			}
			await Comment.remove({ 	_id: { $in: post.comments } }).exec();
			await post.remove();
		} catch ( err ) {
			reject( err );
		}
		resolve();
	});
};

module.exports = removePostAndComments;
