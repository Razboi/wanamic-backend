const
	User = require( "../models/User" ),
	Comment = require( "../models/Comment" ),
	fs = require( "fs" );

removePost = ( user, post ) => {

	return new Promise( async function( resolve, reject ) {
		if ( !user || !post ) {
			reject( "User or Post undefined." );
		}
		try {
			const
				postsIndex = user.posts.indexOf( post.id ),
				newsfeedIndex = user.newsfeed.indexOf( post.id );

			user.posts.splice( postsIndex, 1 );
			user.newsfeed.splice( newsfeedIndex, 1 );
			await user.save();

			User.update(
				{ _id: { $in: [ ...user.friends, ...user.followers ] } },
				{ $pull: { "newsfeed": post._id } },
				{ multi: true }
			).exec();

			await post.remove();
		} catch ( err ) {
			reject( err );
		}
		resolve();
	});
};

module.exports = removePost;
