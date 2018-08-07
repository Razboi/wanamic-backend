const
	User = require( "../models/User" ),
	Comment = require( "../models/Comment" ),
	fs = require( "fs" );

removePost = async( user, post ) => {
	if ( !user || !post ) {
		throw new Error( "User or Post undefined." );
	}
	try {
		const
			postsIndex = user.posts.indexOf( post.id ),
			newsfeedIndex = user.newsfeed.indexOf( post.id );
		user.posts.splice( postsIndex, 1 );
		user.newsfeed.splice( newsfeedIndex, 1 );
		let updateNewsfeed = User.update(
			{ _id: { $in: [ ...user.friends, ...user.followers ] } },
			{ $pull: { "newsfeed": post._id } },
			{ multi: true }
		).exec();
		await Promise.all([ user.save(), updateNewsfeed ]);
		await post.remove();
		return true;
	} catch ( err ) {
		throw err;
	}
};

module.exports = removePost;
